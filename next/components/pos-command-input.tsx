'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input, Card } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useCommandManager } from '@/hooks/useCommandManager';
import { useCurrentOrder, usePaymentQuery, useOrderNoteQuery, useCustomerInfoQuery } from '@/stores/orders';
import { useProductsQuery } from '@/stores/products';
import { CommandContext, CustomerData } from '@/commands/command-manager';
import { isValidFrontendId } from '@/lib/frontend-id';
import { updateLocalOrder, updateLocalOrderStatus } from '@/stores/offline-orders';
import { syncOrder } from '@/services/sync';
import type { LocalOrder } from '@/db';
import type { LineItemSchema, CouponLineSchema } from '@/api/orders';
import OrdersAPI from '@/api/orders';
import CouponsAPI from '@/api/coupons';

interface POSCommandInputProps {
  onMessage?: (message: string, type: 'success' | 'error') => void;
  onAddProduct?: (productId: number, variationId: number, quantity: number, mode: 'set' | 'increment') => Promise<void>;
  onPrint?: (type: 'bill' | 'kot') => Promise<void>;
  onOpenDrawer?: () => Promise<void>;
}

export function POSCommandInput({ onMessage, onAddProduct, onPrint, onOpenDrawer }: POSCommandInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const urlOrderId = params?.orderId as string | undefined;
  const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

  // Hooks for data
  const orderQuery = useCurrentOrder();
  const { data: products = [] } = useProductsQuery();

  // Hooks for mutations - these provide access to the mutation functions
  const [, paymentMutation] = usePaymentQuery(orderQuery);
  const [, noteMutation] = useOrderNoteQuery(orderQuery);
  const [, customerInfoMutation] = useCustomerInfoQuery(orderQuery);

  // Command manager
  const {
    isReady,
    setContext,
    processInput,
    getAutocompleteSuggestions,
    navigateHistory,
    getPrompt,
    isInMultiMode,
    getActiveCommand
  } = useCommandManager();

  // Get payment received helper
  const getPaymentReceived = useCallback((): number => {
    const paymentMeta = orderQuery.data?.meta_data?.find(meta => meta.key === 'payment_received');
    return parseFloat(String(paymentMeta?.value || '0'));
  }, [orderQuery.data?.meta_data]);

  // Clear order - remove all line items
  const clearOrder = useCallback(async () => {
    if (!orderQuery.data || !urlOrderId) return;

    if (isFrontendIdOrder) {
      // For local orders, clear the line items in Dexie
      await updateLocalOrder(urlOrderId, {
        line_items: [],
      });
      // Invalidate local order query to refresh UI
      await queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
      // Queue sync operation (async - don't await)
      syncOrder(urlOrderId).catch(console.error);
    } else {
      // For server orders, mark all line items for deletion
      const deleteItems: LineItemSchema[] = orderQuery.data.line_items
        .filter(item => item.id)
        .map(item => ({
          id: item.id,
          name: item.name,
          product_id: item.product_id,
          variation_id: item.variation_id,
          quantity: 0,
        }));

      if (deleteItems.length > 0) {
        const updatedOrder = await OrdersAPI.updateOrder(orderQuery.data.id.toString(), {
          line_items: deleteItems,
        });
        queryClient.setQueryData(['orders', orderQuery.data.id, 'detail'], updatedOrder);
      }
    }
  }, [orderQuery.data, urlOrderId, isFrontendIdOrder, queryClient]);

  // Complete order - mark as completed
  const completeOrder = useCallback(async () => {
    if (!orderQuery.data || !urlOrderId) return;

    if (isFrontendIdOrder) {
      // Update local order status to completed
      await updateLocalOrderStatus(urlOrderId, 'completed');

      // Invalidate queries to update UI
      await queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
      await queryClient.invalidateQueries({ queryKey: ['localOrders'] });
      await queryClient.invalidateQueries({ queryKey: ['ordersWithFrontendIds'] });

      // Sync to server
      syncOrder(urlOrderId).catch(console.error);

      // Navigate to orders list or next order
      router.push('/orders');
    } else {
      // Update server order status
      await OrdersAPI.updateOrder(orderQuery.data.id.toString(), {
        status: 'completed',
      });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['orders'] });

      // Navigate away
      router.push('/orders');
    }
  }, [orderQuery.data, urlOrderId, isFrontendIdOrder, queryClient, router]);

  // Set payment amount
  const setPayment = useCallback(async (amount: number) => {
    await paymentMutation.mutateAsync({ received: amount });
  }, [paymentMutation]);

  // Apply coupon
  const applyCoupon = useCallback(async (code: string) => {
    if (!orderQuery.data || !urlOrderId) return;

    const couponCode = code.trim().toLowerCase();

    // First validate the coupon
    const coupon = await CouponsAPI.getCouponByCode(couponCode);
    if (!coupon) {
      throw new Error(`Coupon "${code}" not found`);
    }

    // Calculate discount amount
    let discountAmount = 0;
    const subtotal = parseFloat(orderQuery.data.subtotal || orderQuery.data.total || '0');

    if (coupon.discount_type === 'percent') {
      discountAmount = (subtotal * parseFloat(coupon.amount)) / 100;
    } else {
      discountAmount = parseFloat(coupon.amount);
    }

    // Build new coupon line
    const newCouponLine: CouponLineSchema = {
      code: couponCode,
      discount: discountAmount.toFixed(2),
      discount_tax: '0.00',
    };

    // Get existing coupons (excluding the one we're adding)
    const existingCoupons = (orderQuery.data.coupon_lines || []).filter(c => c.code !== couponCode);
    const updatedCouponLines = [...existingCoupons, newCouponLine];

    // Calculate total discount
    const totalDiscount = updatedCouponLines.reduce((sum, c) => {
      return sum + parseFloat(c.discount || '0');
    }, 0);

    if (isFrontendIdOrder) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
        coupon_lines: updatedCouponLines,
        discount_total: totalDiscount.toFixed(2),
      });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      syncOrder(urlOrderId).catch(console.error);
    } else {
      const existingCodes = existingCoupons.map(c => ({ code: c.code }));
      const updatedOrder = await OrdersAPI.updateOrder(orderQuery.data.id.toString(), {
        coupon_lines: [...existingCodes, { code: couponCode }] as CouponLineSchema[],
      });
      queryClient.setQueryData(['orders', orderQuery.data.id, 'detail'], updatedOrder);
    }
  }, [orderQuery.data, urlOrderId, isFrontendIdOrder, queryClient]);

  // Remove coupon
  const removeCoupon = useCallback(async () => {
    if (!orderQuery.data || !urlOrderId) return;

    if (isFrontendIdOrder) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
        coupon_lines: [],
        discount_total: '0.00',
      });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      syncOrder(urlOrderId).catch(console.error);
    } else {
      // For server orders, we need to remove all coupons
      // WooCommerce requires passing empty array or marking items for deletion
      const updatedOrder = await OrdersAPI.updateOrder(orderQuery.data.id.toString(), {
        coupon_lines: [],
      });
      queryClient.setQueryData(['orders', orderQuery.data.id, 'detail'], updatedOrder);
    }
  }, [orderQuery.data, urlOrderId, isFrontendIdOrder, queryClient]);

  // Set note
  const setNote = useCallback(async (note: string) => {
    await noteMutation.mutateAsync({ note });
  }, [noteMutation]);

  // Set customer
  const setCustomer = useCallback(async (customer: CustomerData) => {
    // Parse customer data into billing schema
    const nameParts = customer.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    await customerInfoMutation.mutateAsync({
      billing: {
        first_name: firstName,
        last_name: lastName,
        phone: customer.phone,
        address_1: customer.address || '',
      },
    });
  }, [customerInfoMutation]);

  // Print handler
  const print = useCallback(async (type: 'bill' | 'kot') => {
    if (onPrint) {
      await onPrint(type);
    } else {
      // Default no-op or could show a message
      onMessage?.(`Print ${type} not configured`, 'error');
    }
  }, [onPrint, onMessage]);

  // Open drawer handler
  const openDrawer = useCallback(async () => {
    if (onOpenDrawer) {
      await onOpenDrawer();
    } else {
      // Default no-op - drawer might not be available
      console.log('Cash drawer command - no handler configured');
    }
  }, [onOpenDrawer]);

  // Navigate to next order
  const navigateToNextOrder = useCallback(() => {
    router.push('/orders');
  }, [router]);

  // Invalidate products (for stock command)
  const invalidateProducts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
  }, [queryClient]);

  // Create the command context
  const commandContext = useMemo((): CommandContext | null => {
    if (!orderQuery.data || !products.length) {
      return null;
    }

    return {
      currentOrder: orderQuery.data,
      products,
      updateLineItem: onAddProduct || (async () => { throw new Error('updateLineItem not configured'); }),
      clearOrder,
      completeOrder,
      setPayment,
      getPaymentReceived,
      applyCoupon,
      removeCoupon,
      setNote,
      setCustomer,
      print,
      openDrawer,
      navigateToNextOrder,
      invalidateProducts,
      showMessage: (message: string) => {
        onMessage?.(message, 'success');
      },
      showError: (error: string) => {
        onMessage?.(error, 'error');
      }
    };
  }, [
    orderQuery.data,
    products,
    onAddProduct,
    clearOrder,
    completeOrder,
    setPayment,
    getPaymentReceived,
    applyCoupon,
    removeCoupon,
    setNote,
    setCustomer,
    print,
    openDrawer,
    navigateToNextOrder,
    invalidateProducts,
    onMessage,
  ]);

  // Set up command context when ready
  useEffect(() => {
    if (isReady && commandContext) {
      setContext(commandContext);
    }
  }, [isReady, commandContext, setContext]);

  // Update suggestions when input changes
  useEffect(() => {
    if (input.trim()) {
      const commandSuggestions = getAutocompleteSuggestions(input);
      setSuggestions(commandSuggestions.map(s => s.insertText));
    } else {
      setSuggestions([]);
    }
    setSelectedSuggestion(-1);
  }, [input, getAutocompleteSuggestions]);

  // Handle input submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    try {
      const result = await processInput(input.trim());
      
      if (result.success) {
        setInput('');
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    } catch (error) {
      console.error('Command execution error:', error);
      onMessage?.(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestion(prev => 
            prev <= 0 ? suggestions.length - 1 : prev - 1
          );
        } else {
          // Navigate command history
          const historyItem = navigateHistory('up');
          if (historyItem !== null) {
            setInput(historyItem);
          }
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (suggestions.length > 0) {
          setSelectedSuggestion(prev => 
            prev >= suggestions.length - 1 ? -1 : prev + 1
          );
        } else {
          // Navigate command history
          const historyItem = navigateHistory('down');
          if (historyItem !== null) {
            setInput(historyItem);
          }
        }
        break;

      case 'Tab':
        e.preventDefault();
        if (selectedSuggestion >= 0 && suggestions[selectedSuggestion]) {
          setInput(suggestions[selectedSuggestion]);
          setSuggestions([]);
          setSelectedSuggestion(-1);
        }
        break;

      case 'Escape':
        setSuggestions([]);
        setSelectedSuggestion(-1);
        break;
    }
  };

  // Get current prompt
  const prompt = getPrompt();
  const multiMode = isInMultiMode();
  const activeCommand = getActiveCommand();

  if (!isReady || !commandContext) {
    return (
      <Card className="p-4">
        <div className="text-gray-500">Loading command system...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-2">
      {/* Status indicator */}
      {multiMode && (
        <div className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
          Multi-input mode: {activeCommand} (type &apos;/&apos; to exit)
        </div>
      )}
      
      {/* Command input */}
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={multiMode ? 
            `Enter ${activeCommand} parameters...` : 
            "Type commands starting with /"
          }
          startContent={
            <span className="text-gray-500 font-mono text-sm min-w-fit">
              {prompt}
            </span>
          }
          className="font-mono"
          size="lg"
          autoComplete="off"
          variant="bordered"
        />
        
        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`px-3 py-2 cursor-pointer text-sm font-mono ${
                  index === selectedSuggestion 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  setInput(suggestion);
                  setSuggestions([]);
                  setSelectedSuggestion(-1);
                  inputRef.current?.focus();
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </form>
      
      {/* Help text */}
      <div className="text-xs text-gray-400">
        {multiMode ? (
          `Multi-input mode: Type ${activeCommand} parameters, or &quot;/&quot; to exit`
        ) : (
          'Commands: /add <sku> [qty] | /add (multi-mode) | ↑↓ for history'
        )}
      </div>
    </Card>
  );
}