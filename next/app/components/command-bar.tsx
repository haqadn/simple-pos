'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input, Kbd, Link, useDisclosure } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCommandManager } from '@/hooks/useCommandManager';
import { useCurrentOrder, useOrdersStore } from '@/stores/orders';
import { useProductsQuery, useGetProductById } from '@/stores/products';
import { usePrintStore, PrintJobData } from '@/stores/print';
import { CommandContext, CustomerData } from '@/commands/command-manager';
import { CommandSuggestion } from '@/commands/command';
import OrdersAPI, { OrderSchema } from '@/api/orders';
import { DRAFT_ORDER_ID } from '@/stores/draft-order';
import { useSettingsStore, type PageShortcut } from '@/stores/settings';
import { SettingsModal } from './settings-modal';
import { ShortcutModal } from './shortcut-modal';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings01Icon } from '@hugeicons/core-free-icons';

export default function CommandBar() {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  // Hooks for data
  const orderQuery = useCurrentOrder();
  const { data: products = [] } = useProductsQuery();
  const { ordersQuery } = useOrdersStore();
  const getProductById = useGetProductById();
  const skipKotCategories = useSettingsStore(state => state.skipKotCategories);

  // Helper to check if a line item should be skipped on KOT based on category
  const shouldSkipForKot = useMemo(() => {
    if (!products || products.length === 0 || skipKotCategories.length === 0) return () => false;

    return (productId: number, variationId: number) => {
      const product = products.find(
        p => p.product_id === productId && p.variation_id === variationId
      );
      if (!product) return false;
      return product.categories.some(cat => skipKotCategories.includes(cat.id));
    };
  }, [products, skipKotCategories]);
  
  // Command manager
  const {
    isReady,
    setContext,
    processInput,
    getAutocompleteSuggestions,
    navigateHistory,
    getPrompt,
    isInMultiMode,
    getActiveCommand,
    setSuggestionsCallback
  } = useCommandManager();

  // Handle adding products to the order
  const handleAddProduct = useCallback(async (productId: number, variationId: number, quantity: number, mode: 'set' | 'increment') => {
    try {
      const product = getProductById(productId, variationId);

      if (!product) {
        throw new Error(`Product not found: ${productId}/${variationId}`);
      }

      if (!orderQuery.data) {
        throw new Error('No active order');
      }

      const orderId = orderQuery.data.id;
      const orderQueryKey = ['orders', orderId, 'detail'];

      // Get fresh order data from cache (not stale React state)
      const currentOrder = queryClient.getQueryData<typeof orderQuery.data>(orderQueryKey) || orderQuery.data;

      // Find existing line items for this product
      const existingLineItems = currentOrder.line_items.filter(
        li => li.product_id === productId && li.variation_id === variationId
      );

      // Calculate current quantity
      const currentQuantity = existingLineItems.reduce((sum, li) => sum + li.quantity, 0);
      const newQuantity = mode === 'set' ? quantity : currentQuantity + quantity;

      // Optimistically update the cache immediately
      const optimisticOrder = { ...currentOrder };
      optimisticOrder.line_items = currentOrder.line_items.filter(
        li => !(li.product_id === productId && li.variation_id === variationId)
      );
      if (newQuantity > 0) {
        optimisticOrder.line_items = [
          ...optimisticOrder.line_items,
          {
            name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
            product_id: productId,
            variation_id: variationId,
            quantity: newQuantity,
          }
        ];
      }
      queryClient.setQueryData(orderQueryKey, optimisticOrder);

      // Call the API
      const OrdersAPI = (await import('@/api/orders')).default;

      // Prepare line items for the update
      const lineItems: Array<{ id?: number; product_id: number; variation_id: number; quantity: number; name: string }> = [];

      // Remove existing items (set quantity to 0)
      existingLineItems.forEach(li => {
        if (li.id && li.name) {
          lineItems.push({ id: li.id, product_id: li.product_id, variation_id: li.variation_id, name: li.name, quantity: 0 });
        }
      });

      // Add new item with total quantity
      if (newQuantity > 0) {
        lineItems.push({
          name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
          product_id: productId,
          variation_id: variationId,
          quantity: newQuantity,
          id: undefined,
        });
      }

      // Update the order via API
      const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
        line_items: lineItems
      });

      // Update cache with server response
      queryClient.setQueryData(orderQueryKey, updatedOrder);

      // Invalidate line item queries to sync UI
      await queryClient.invalidateQueries({
        queryKey: ['orders', orderId, 'lineItem']
      });

    } catch (error) {
      // On error, invalidate to refetch correct state
      if (orderQuery.data?.id) {
        queryClient.invalidateQueries({
          queryKey: ['orders', orderQuery.data.id]
        });
      }
      console.error('Failed to add product:', error);
      throw error;
    }
  }, [orderQuery, getProductById, queryClient]);

  // Clear all items from order
  const handleClearOrder = useCallback(async () => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;
    const orderQueryKey = ['orders', orderId, 'detail'];

    // Get fresh data
    const currentOrder = queryClient.getQueryData<OrderSchema>(orderQueryKey) || orderQuery.data;

    // Mark all existing items for deletion
    const lineItems = currentOrder.line_items
      .filter(li => li.id)
      .map(li => ({ id: li.id, product_id: li.product_id, variation_id: li.variation_id, name: li.name || '', quantity: 0 }));

    if (lineItems.length === 0) return;

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, line_items: [] });

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { line_items: lineItems });
    queryClient.setQueryData(orderQueryKey, updatedOrder);

    await queryClient.invalidateQueries({ queryKey: ['orders', orderId, 'lineItem'] });
  }, [orderQuery, queryClient]);

  // Complete the order
  const handleCompleteOrder = useCallback(async () => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;

    // Update order status to completed
    await OrdersAPI.updateOrder(orderId.toString(), { status: 'completed' });

    // Invalidate queries
    await queryClient.invalidateQueries({ queryKey: ['orders'] });

    // Navigate to next pending order or home
    const orders = ordersQuery.data || [];
    const nextOrder = orders.find(o => o.id !== orderId && o.status === 'pending');
    if (nextOrder) {
      router.push(`/orders/${nextOrder.id}`);
    } else {
      router.push('/');
    }
  }, [orderQuery, queryClient, ordersQuery, router]);

  // Set payment amount
  const handleSetPayment = useCallback(async (amount: number) => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;
    const orderQueryKey = ['orders', orderId, 'detail'];

    const currentOrder = queryClient.getQueryData<OrderSchema>(orderQueryKey) || orderQuery.data;

    // Update meta_data with both split_payments (for UI) and payment_received (for legacy)
    const metaData = currentOrder.meta_data.filter(
      m => m.key !== 'payment_received' && m.key !== 'split_payments'
    );
    metaData.push({ key: 'split_payments', value: JSON.stringify({ cash: amount }) });
    metaData.push({ key: 'payment_received', value: amount.toString() });

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, meta_data: metaData });

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { meta_data: metaData });
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient]);

  // Get current payment received
  const getPaymentReceived = useCallback((): number => {
    if (!orderQuery.data) return 0;
    const paymentMeta = orderQuery.data.meta_data.find(m => m.key === 'payment_received');
    return paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;
  }, [orderQuery.data]);

  // Apply coupon
  const handleApplyCoupon = useCallback(async (code: string) => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;

    // WooCommerce expects coupon_lines array
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
      coupon_lines: [{ code }]
    } as Partial<OrderSchema>);

    const orderQueryKey = ['orders', orderId, 'detail'];
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient]);

  // Remove coupon
  const handleRemoveCoupon = useCallback(async () => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;

    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
      coupon_lines: []
    } as Partial<OrderSchema>);

    const orderQueryKey = ['orders', orderId, 'detail'];
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient]);

  // Print - uses print store queue
  const printStore = usePrintStore();

  // Helper to wait for mutations to settle and get fresh order data
  const waitForMutationsRef = useRef<() => Promise<OrderSchema | null>>(() => Promise.resolve(null));
  waitForMutationsRef.current = async () => {
    const currentOrderId = orderQuery.data?.id;
    if (!currentOrderId || currentOrderId === DRAFT_ORDER_ID) return orderQuery.data;

    // Poll until no mutations are in progress
    const checkMutations = () => {
      const mutating = queryClient.isMutating({
        predicate: (mutation) => {
          const key = mutation.options.mutationKey;
          return Array.isArray(key) && key[0] === 'orders' && key[1] === currentOrderId;
        }
      });
      return mutating > 0;
    };

    // Wait for mutations to complete (max 5 seconds)
    let attempts = 0;
    while (checkMutations() && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    // Fetch fresh order data from server
    const freshOrder = await OrdersAPI.getOrder(currentOrderId.toString());
    return freshOrder;
  };

  const handlePrint = useCallback(async (type: 'bill' | 'kot') => {
    if (!orderQuery.data) throw new Error('No active order');

    // For bills, wait for mutations and use fresh data to ensure correct totals
    const order = type === 'bill'
      ? (await waitForMutationsRef.current?.()) ?? orderQuery.data
      : orderQuery.data;
    const orderId = order.id;
    const shippingLine = order.shipping_lines?.find(s => s.method_title);
    const isTable = shippingLine?.method_id === 'pickup_location';

    // Build print data based on type
    const printData: PrintJobData = {
      orderId,
      orderReference: orderId.toString(),
      cartName: shippingLine?.method_title || 'Order',
      serviceType: shippingLine ? (isTable ? 'table' : 'delivery') : undefined,
      orderTime: order.date_created,
      customerNote: order.customer_note,
      customer: {
        name: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        phone: order.billing.phone,
      },
    };

    if (type === 'bill') {
      // Bill data - use subtotal/quantity for unit price, or price field if available
      printData.items = order.line_items.map(item => {
        const subtotal = parseFloat(item.subtotal || '0');
        const unitPrice = item.quantity > 0 ? subtotal / item.quantity : parseFloat(item.price?.toString() || '0');
        return {
          id: item.id || 0,
          name: item.name,
          quantity: item.quantity,
          price: unitPrice,
        };
      });
      printData.total = parseFloat(order.total);
      printData.discountTotal = parseFloat(order.discount_total || '0');
      // Sum up shipping costs from all shipping lines
      printData.shippingTotal = order.shipping_lines?.reduce(
        (sum, line) => sum + parseFloat(line.total || '0'), 0
      ) || 0;
      const paymentMeta = order.meta_data.find(m => m.key === 'payment_received');
      printData.payment = paymentMeta ? parseFloat(paymentMeta.value?.toString() || '0') : 0;
    } else {
      // Get previous KOT items from meta_data for change detection
      const lastKotMeta = order.meta_data.find(m => m.key === 'last_kot_items');
      const previousItems: Record<string, { quantity: number; name: string }> = {};
      if (lastKotMeta && typeof lastKotMeta.value === 'string') {
        try {
          const parsed = JSON.parse(lastKotMeta.value);
          // Handle both old format (number) and new format ({quantity, name})
          Object.entries(parsed).forEach(([key, val]) => {
            if (typeof val === 'number') {
              previousItems[key] = { quantity: val, name: 'Unknown Item' };
            } else if (val && typeof val === 'object' && 'quantity' in val) {
              previousItems[key] = val as { quantity: number; name: string };
            }
          });
        } catch { /* ignore parse errors */ }
      }

      // Track which previous items we've seen
      const seenKeys = new Set<string>();

      // Current items (filtered by category)
      const kotItems = order.line_items
        .filter(item => !shouldSkipForKot(item.product_id, item.variation_id))
        .map(item => {
          const itemKey = `${item.product_id}-${item.variation_id}`;
          seenKeys.add(itemKey);
          return {
            id: item.id || 0,
            name: item.name,
            quantity: item.quantity,
            previousQuantity: previousItems[itemKey]?.quantity,
          };
        });

      // Add removed items (were in previous KOT but not in current order)
      // Parse itemKey to get product/variation IDs for category filtering
      Object.entries(previousItems).forEach(([itemKey, prev]) => {
        if (!seenKeys.has(itemKey) && prev.quantity > 0) {
          const [productId, variationId] = itemKey.split('-').map(Number);
          if (!shouldSkipForKot(productId, variationId)) {
            kotItems.push({
              id: 0,
              name: prev.name,
              quantity: 0,
              previousQuantity: prev.quantity,
            });
          }
        }
      });

      printData.kotItems = kotItems;
    }

    // Queue the print job
    await printStore.push(type, printData);

    // Mark as printed in meta_data
    const metaKey = type === 'bill' ? 'last_bill_print' : 'last_kot_print';
    const metaUpdates = [
      ...order.meta_data.filter(m => m.key !== metaKey && m.key !== 'last_kot_items'),
      { key: metaKey, value: new Date().toISOString() }
    ];

    // For KOT, also save current items for next change detection (with names for removed item display)
    if (type === 'kot') {
      const currentItems: Record<string, { quantity: number; name: string }> = {};
      order.line_items.forEach(item => {
        const itemKey = `${item.product_id}-${item.variation_id}`;
        currentItems[itemKey] = { quantity: item.quantity, name: item.name };
      });
      metaUpdates.push({ key: 'last_kot_items', value: JSON.stringify(currentItems) });
    }

    await OrdersAPI.updateOrder(orderId.toString(), {
      meta_data: metaUpdates
    });
  }, [orderQuery, printStore, shouldSkipForKot]);

  // Open cash drawer
  const handleOpenDrawer = useCallback(async () => {
    await printStore.push('drawer', null);
  }, [printStore]);

  // Set customer note
  const handleSetNote = useCallback(async (note: string) => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;
    const orderQueryKey = ['orders', orderId, 'detail'];
    const noteQueryKey = ['orders', orderId, 'note'];

    const currentOrder = queryClient.getQueryData<OrderSchema>(orderQueryKey) || orderQuery.data;

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, customer_note: note });
    queryClient.setQueryData(noteQueryKey, note);

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { customer_note: note });
    queryClient.setQueryData(orderQueryKey, updatedOrder);
    queryClient.setQueryData(noteQueryKey, updatedOrder.customer_note);
  }, [orderQuery, queryClient]);

  // Set customer info
  const handleSetCustomer = useCallback(async (customer: CustomerData) => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;
    const orderQueryKey = ['orders', orderId, 'detail'];
    const customerInfoKey = ['orders', orderId, 'customerInfo'];

    const currentOrder = queryClient.getQueryData<OrderSchema>(orderQueryKey) || orderQuery.data;

    // Parse name into first and last
    const nameParts = customer.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const billing = {
      ...currentOrder.billing,
      first_name: firstName,
      last_name: lastName,
      phone: customer.phone,
      ...(customer.address && { address_1: customer.address })
    };

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, billing });
    queryClient.setQueryData(customerInfoKey, billing);

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { billing });
    queryClient.setQueryData(orderQueryKey, updatedOrder);
    queryClient.setQueryData(customerInfoKey, updatedOrder.billing);
  }, [orderQuery, queryClient]);

  // Create the command context
  const commandContext = useMemo((): CommandContext | null => {
    if (!orderQuery.data || !products.length) {
      return null;
    }

    return {
      currentOrder: orderQuery.data,
      products,
      updateLineItem: handleAddProduct,
      clearOrder: handleClearOrder,
      completeOrder: handleCompleteOrder,
      setPayment: handleSetPayment,
      getPaymentReceived,
      applyCoupon: handleApplyCoupon,
      removeCoupon: handleRemoveCoupon,
      print: handlePrint,
      openDrawer: handleOpenDrawer,
      invalidateProducts: async () => {
        await queryClient.invalidateQueries({ queryKey: ['products'] });
      },
      setNote: handleSetNote,
      setCustomer: handleSetCustomer,
      showMessage: (msg) => console.log('[Command]', msg),
      showError: (err) => console.error('[Command Error]', err)
    };
  }, [orderQuery.data, products, handleAddProduct, handleClearOrder, handleCompleteOrder, handleSetPayment, getPaymentReceived, handleApplyCoupon, handleRemoveCoupon, handlePrint, handleOpenDrawer, handleSetNote, handleSetCustomer, queryClient]);

  // Set up command context when ready
  useEffect(() => {
    if (isReady && commandContext) {
      setContext(commandContext);
    }
  }, [isReady, commandContext, setContext]);

  // Update suggestions when input changes
  useEffect(() => {
    if (input.trim()) {
      // If the last character is a space, don't suggest anything
      if (input.endsWith(' ')) {
        setSuggestions([]);
        setSelectedSuggestion(-1);
      } else {
        const commandSuggestions = getAutocompleteSuggestions(input);
        setSuggestions(commandSuggestions);
        // Auto-select first suggestion if available
        setSelectedSuggestion(commandSuggestions.length > 0 ? 0 : -1);
      }
    } else {
      setSuggestions([]);
      setSelectedSuggestion(-1);
    }
  }, [input, getAutocompleteSuggestions]);

  // Set up callback for async suggestion updates (e.g., customer search)
  useEffect(() => {
    const refreshSuggestions = () => {
      if (input.trim() && !input.endsWith(' ')) {
        const commandSuggestions = getAutocompleteSuggestions(input);
        setSuggestions(commandSuggestions);
        setSelectedSuggestion(commandSuggestions.length > 0 ? 0 : -1);
      }
    };
    setSuggestionsCallback(refreshSuggestions);
  }, [input, getAutocompleteSuggestions, setSuggestionsCallback]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestions.length > 0 &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [suggestions.length]);

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
      // No user notification - silent failure
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Forward Ctrl/Alt shortcuts to window so global handler can process them
    if (e.ctrlKey || e.altKey || e.metaKey) {
      e.preventDefault(); // Prevent special characters from being typed
      // Dispatch a new event to window since HeroUI Input blocks propagation
      const event = new KeyboardEvent('keydown', {
        key: e.key,
        code: e.nativeEvent.code,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        bubbles: true,
      });
      window.dispatchEvent(event);
      return;
    }

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
          const suggestion = suggestions[selectedSuggestion];
          
          // If it's a command suggestion, replace the entire input
          if (suggestion.type === 'command') {
            setInput(suggestion.insertText);
          } else {
            // For parameters, replace the current word being typed
            const inputParts = input.split(' ');
            const lastPartIndex = inputParts.length - 1;
            inputParts[lastPartIndex] = suggestion.text;
            setInput(inputParts.join(' '));
          }
          
          setSuggestions([]);
          setSelectedSuggestion(-1);
        }
        break;

      case 'Escape':
        if (suggestions.length > 0) {
          // First press: clear suggestions
          e.preventDefault();
          setSuggestions([]);
          setSelectedSuggestion(-1);
        } else if (input.trim()) {
          // Second press: clear input
          e.preventDefault();
          setInput('');
        } else {
          // Third press: blur the input
          e.preventDefault();
          inputRef.current?.blur();
        }
        break;
    }
  };

  // Get current prompt
  const prompt = getPrompt();
  const multiMode = isInMultiMode();
  const activeCommand = getActiveCommand();

  if (!isReady || !commandContext) {
    return (
      <Input 
        classNames={{ 
          mainWrapper: 'w-full',
        }} 
        labelPlacement="outside-left" 
        label="Command"
        aria-label="Loading command system..."
        placeholder="Loading..."
        disabled
      />
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Command input */}
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          classNames={{ 
            mainWrapper: 'w-full',
          }}
          labelPlacement="outside-left"
          label="Command"
          placeholder={multiMode ?
            `Enter ${activeCommand} parameters...` :
            "Type SKU to add items, / for commands"
          }
          startContent={
            <span className="text-gray-500 font-mono text-sm min-w-fit">
              {prompt}
            </span>
          }
          className="font-mono"
          autoComplete="off"
          aria-label="Command input field"
        />
        
        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <div ref={suggestionsRef} className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`px-3 py-2 cursor-pointer text-sm ${
                  index === selectedSuggestion 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  // Same logic as Tab completion
                  if (suggestion.type === 'command') {
                    setInput(suggestion.insertText);
                  } else {
                    const inputParts = input.split(' ');
                    const lastPartIndex = inputParts.length - 1;
                    inputParts[lastPartIndex] = suggestion.text;
                    setInput(inputParts.join(' '));
                  }
                  
                  setSuggestions([]);
                  setSelectedSuggestion(-1);
                  inputRef.current?.focus();
                }}
              >
                <div className="font-mono">{suggestion.text}</div>
                {suggestion.description && (
                  <div className="text-xs text-gray-500">{suggestion.description}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </form>
      
      {/* Help text */}
      <HelpTextBar multiMode={multiMode} activeCommand={activeCommand} />
    </div>
  );
}

function HelpTextBar({ multiMode, activeCommand }: { multiMode: boolean; activeCommand: string | undefined }) {
  const pageShortcuts = useSettingsStore((state) => state.pageShortcuts);
  const [activeShortcut, setActiveShortcut] = useState<PageShortcut | null>(null);
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onOpenChange: onSettingsOpenChange } = useDisclosure();
  const { isOpen: isShortcutOpen, onOpen: onShortcutOpen, onOpenChange: onShortcutOpenChange } = useDisclosure();

  const handleOpenShortcut = (shortcut: PageShortcut) => {
    setActiveShortcut(shortcut);
    onShortcutOpen();
  };

  return (
    <div className="text-xs text-gray-400 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {multiMode ? (
          `Multi-input mode: Type ${activeCommand} parameters, or "/" to exit`
        ) : (
          <>
            <span>SKU [qty] | /pay /done /clear | ↑↓ history |</span>
            <Kbd className="text-[10px]">Esc</Kbd>
          </>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link
          className="text-gray-400 cursor-pointer hover:text-gray-600"
          onPress={onSettingsOpen}
          aria-label="Settings"
        >
          <HugeiconsIcon icon={Settings01Icon} className="h-4 w-4" />
        </Link>
        {pageShortcuts.map((shortcut) => (
          <span key={shortcut.id} className="flex items-center">
            <span className="mx-1">|</span>
            <Link
              size="sm"
              className="text-xs text-gray-400 cursor-pointer"
              onPress={() => handleOpenShortcut(shortcut)}
            >
              {shortcut.name}
            </Link>
          </span>
        ))}
      </div>
      <SettingsModal isOpen={isSettingsOpen} onOpenChange={onSettingsOpenChange} />
      {activeShortcut && (
        <ShortcutModal
          isOpen={isShortcutOpen}
          onOpenChange={onShortcutOpenChange}
          name={activeShortcut.name}
          url={activeShortcut.url}
        />
      )}
    </div>
  );
}