'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useCommandManager } from '@/hooks/useCommandManager';
import { useCurrentOrder, useServiceQuery } from '@/stores/orders';
import { useProductsQuery, useGetProductById } from '@/stores/products';
import { useTablesQuery, useDeliveryZonesQuery } from '@/stores/service';
import type { ServiceMethodSchema } from '@/stores/service';
import { CommandContext, CurrencyConfig } from '@/commands/command-manager';
import { CommandSuggestion } from '@/commands/command';
import OrdersAPI, { OrderSchema } from '@/api/orders';
import { DRAFT_ORDER_ID, useDraftOrderStore } from '@/stores/draft-order';
import { useDraftOrderState } from '@/hooks/useDraftOrderState';
import { useSettingsStore } from '@/stores/settings';
import { isAppShortcut } from '@/lib/shortcuts';
import { HelpTextBar, CommandSuggestions, applySuggestion } from './command-bar/index';
import { isValidFrontendId } from '@/lib/frontend-id';
import { updateLocalOrder } from '@/stores/offline-orders';
import { updateLineItem } from '@/lib/line-item-ops';
import type { LocalOrder } from '@/db';
import { useCurrencySettings } from '@/stores/currency';

// Extracted hooks
import { useCommandMessages } from '@/hooks/useCommandMessages';
import { usePaymentHandler } from '@/hooks/usePaymentHandler';
import { useOrderCompletion } from '@/hooks/useOrderCompletion';
import { useCouponHandler } from '@/hooks/useCouponHandler';
import { usePrintHandler } from '@/hooks/usePrintHandler';
import { useOrderNoteAndCustomer } from '@/hooks/useOrderNoteAndCustomer';

export default function CommandBar() {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useParams();

  // Hooks for data
  const orderQuery = useCurrentOrder();
  const { data: products = [] } = useProductsQuery();
  const getProductById = useGetProductById();
  const paymentMethods = useSettingsStore(state => state.paymentMethods);
  const { data: currencySettings } = useCurrencySettings();

  // Service data (tables and delivery zones)
  const [, serviceMutation] = useServiceQuery(orderQuery);
  const { data: tables = [] } = useTablesQuery();
  const { data: deliveryZones = [] } = useDeliveryZonesQuery();

  const availableServices = useMemo((): ServiceMethodSchema[] => {
    return [...tables, ...deliveryZones];
  }, [tables, deliveryZones]);

  // --- Extracted hooks ---
  const { messages, showCommandMessage } = useCommandMessages();
  const { handleSetPayment, getPaymentReceived } = usePaymentHandler();
  const { handleCompleteOrder } = useOrderCompletion();
  const { handleApplyCoupon, handleRemoveCoupon } = useCouponHandler();
  const { handlePrint, handleOpenDrawer } = usePrintHandler();
  const { handleSetNote, handleSetCustomer } = useOrderNoteAndCustomer();

  // Draft order support
  const updateDraftLineItems = useDraftOrderStore((state) => state.updateDraftLineItems);
  const {
    getDraftData,
    acquireSaveLock,
    releaseSaveLock,
    getSavePromise,
    setSavePromise,
    getSavedOrderId,
    setSavedOrderId,
  } = useDraftOrderState();

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
  // Kept inline: tightly coupled to draft order save locks and routing
  const handleAddProduct = useCallback(async (productId: number, variationId: number, quantity: number, mode: 'set' | 'increment') => {
    try {
      const product = getProductById(productId, variationId);

      if (!product) {
        throw new Error(`Product not found: ${productId}/${variationId}`);
      }

      if (!orderQuery.data) {
        throw new Error('No active order');
      }

      // Check if we're on a frontend ID URL (local-first order)
      const urlOrderId = params?.orderId as string | undefined;
      const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

      // For frontend ID orders - use shared line item operation
      if (isFrontendIdOrder && urlOrderId) {
        const result = await updateLineItem(urlOrderId, {
          product_id: productId,
          variation_id: variationId,
          name: product.name,
          variation_name: product.variation_name,
          price: product.price,
        }, quantity, mode);

        queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], result.localOrder);
        return;
      }

      // Legacy flow for /orders/new or server orders
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

      // Handle draft order (/orders/new route) - save to database first
      if (orderId === DRAFT_ORDER_ID && !isFrontendIdOrder) {
        // Update draft store optimistically
        updateDraftLineItems(optimisticOrder.line_items);

        // Check if order was already saved by another mutation
        const alreadySavedId = getSavedOrderId();
        if (alreadySavedId) {
          // Prepare line items for update (no existing IDs in draft)
          const lineItems = optimisticOrder.line_items.map(li => ({
            name: li.name,
            product_id: li.product_id,
            variation_id: li.variation_id,
            quantity: li.quantity,
            id: undefined,
          }));
          const updatedOrder = await OrdersAPI.updateOrder(alreadySavedId.toString(), { line_items: lineItems });
          queryClient.setQueryData(['orders', alreadySavedId, 'detail'], updatedOrder);
          await queryClient.invalidateQueries({ queryKey: ['orders', alreadySavedId] });
          return;
        }

        // Try to acquire the save lock
        const gotLock = acquireSaveLock();
        if (!gotLock) {
          // Another save is in progress, wait for it
          const existingPromise = getSavePromise();
          if (existingPromise) {
            const savedOrder = await existingPromise;
            if (savedOrder) {
              // Order was saved, invalidate to refresh
              await queryClient.invalidateQueries({ queryKey: ['orders', savedOrder.id] });
              return;
            }
          }
          // Check if saved while waiting
          const savedId = getSavedOrderId();
          if (savedId) {
            await queryClient.invalidateQueries({ queryKey: ['orders', savedId] });
            return;
          }
          throw new Error('Failed to save draft order');
        }

        // We have the lock - create the order
        try {
          const savePromise = (async () => {
            const draftData = getDraftData();
            return await OrdersAPI.saveOrder({
              status: 'pending',
              line_items: draftData.line_items,
              customer_note: draftData.customer_note,
              billing: draftData.billing,
              meta_data: draftData.meta_data,
            });
          })();
          setSavePromise(savePromise);

          const savedOrder = await savePromise;
          if (savedOrder) {
            setSavedOrderId(savedOrder.id);
            await queryClient.invalidateQueries({ queryKey: ['orders'] });
            router.replace(`/orders/${savedOrder.id}`);
            return;
          }
          throw new Error('Failed to save draft order');
        } finally {
          releaseSaveLock();
        }
      }

      // Prepare line items for the update (real server order)
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
      const urlOrderId = params?.orderId as string | undefined;
      if (urlOrderId && isValidFrontendId(urlOrderId)) {
        queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
      } else if (orderQuery.data?.id) {
        queryClient.invalidateQueries({
          queryKey: ['orders', orderQuery.data.id]
        });
      }
      console.error('Failed to add product:', error);
      throw error;
    }
  }, [orderQuery, getProductById, queryClient, router, params, updateDraftLineItems, getDraftData, acquireSaveLock, releaseSaveLock, getSavePromise, setSavePromise, getSavedOrderId, setSavedOrderId]);

  // Clear all items from order
  // Kept inline: uses queryClient cache reads and server-order deletion pattern
  const handleClearOrder = useCallback(async () => {
    if (!orderQuery.data) throw new Error('No active order');

    // Check if we're on a frontend ID URL (local-first order)
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      // Save to Dexie with empty line items
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
        line_items: [],
      });

      // Update the cache directly
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
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
  }, [orderQuery, queryClient, params]);

  // Navigate to an order by identifier (frontend ID or server ID)
  const handleNavigateToOrder = useCallback((identifier: string) => {
    router.push(`/orders/${identifier}`);
  }, [router]);

  // Set service (table or delivery zone)
  const handleSetService = useCallback(async (service: ServiceMethodSchema) => {
    if (!orderQuery.data) throw new Error('No active order');
    await serviceMutation.mutateAsync({ service });
  }, [orderQuery.data, serviceMutation]);

  // Get currency configuration for commands
  const getCurrency = useCallback((): CurrencyConfig => {
    return {
      symbol: currencySettings?.currency_symbol || '$',
      position: currencySettings?.currency_position || 'left',
    };
  }, [currencySettings]);

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
      paymentMethods,
      applyCoupon: handleApplyCoupon,
      removeCoupon: handleRemoveCoupon,
      print: handlePrint,
      openDrawer: handleOpenDrawer,
      invalidateProducts: async () => {
        await queryClient.invalidateQueries({ queryKey: ['products'] });
      },
      setNote: handleSetNote,
      setCustomer: handleSetCustomer,
      availableServices,
      setService: handleSetService,
      navigateToOrder: handleNavigateToOrder,
      getCurrency,
      showMessage: (msg) => showCommandMessage(msg, 'success'),
      showError: (err) => showCommandMessage(err, 'error')
    };
  }, [orderQuery.data, products, handleAddProduct, handleClearOrder, handleCompleteOrder, handleSetPayment, getPaymentReceived, paymentMethods, handleApplyCoupon, handleRemoveCoupon, handlePrint, handleOpenDrawer, handleSetNote, handleSetCustomer, availableServices, handleSetService, handleNavigateToOrder, getCurrency, queryClient, showCommandMessage]);

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
      showCommandMessage(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only forward registered app shortcuts to window, let standard text editing shortcuts pass through
    if (isAppShortcut(e)) {
      e.preventDefault();
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
          setInput(applySuggestion(suggestions[selectedSuggestion], input));
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
      <div className="w-full space-y-2">
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
        {/* Always show HelpTextBar so settings gear is accessible */}
        <HelpTextBar multiMode={false} activeCommand={undefined} />
      </div>
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
        <CommandSuggestions
          suggestions={suggestions}
          selectedIndex={selectedSuggestion}
          suggestionsRef={suggestionsRef}
          onSelect={(suggestion) => {
            setInput(applySuggestion(suggestion, input));
            setSuggestions([]);
            setSelectedSuggestion(-1);
            inputRef.current?.focus();
          }}
        />
      </form>

      {/* Help text */}
      <HelpTextBar multiMode={multiMode} activeCommand={activeCommand} />

      {/* Snackbar messages (floating, no layout shift) */}
      {messages.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`pointer-events-auto text-sm px-4 py-2 rounded-lg shadow-lg max-w-md truncate ${
                msg.type === 'error'
                  ? 'text-white bg-red-600'
                  : 'text-white bg-zinc-800'
              }`}
            >
              {msg.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
