'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useCommandManager } from '@/hooks/useCommandManager';
import { useCurrentOrder, useOrdersStore } from '@/stores/orders';
import { useProductsQuery, useGetProductById } from '@/stores/products';
import { usePrintStore } from '@/stores/print';
import { buildPrintData, buildPrintMetaUpdates } from '@/lib/print-data';
import { CommandContext, CustomerData, CurrencyConfig } from '@/commands/command-manager';
import { CommandSuggestion } from '@/commands/command';
import OrdersAPI, { OrderSchema } from '@/api/orders';
import { DRAFT_ORDER_ID, useDraftOrderStore } from '@/stores/draft-order';
import { useDraftOrderState } from '@/hooks/useDraftOrderState';
import { useSettingsStore } from '@/stores/settings';
import { isAppShortcut } from '@/lib/shortcuts';
import { createShouldSkipForKot } from '@/lib/kot';
import { HelpTextBar, CommandSuggestions, applySuggestion } from './command-bar/index';
import { isValidFrontendId } from '@/lib/frontend-id';
import { updateLocalOrderStatus, getLocalOrder, updateLocalOrder } from '@/stores/offline-orders';
import { syncOrder } from '@/services/sync';
import type { LocalOrder } from '@/db';
import { useCurrencySettings } from '@/stores/currency';

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
  const { ordersQuery } = useOrdersStore();
  const getProductById = useGetProductById();
  const skipKotCategories = useSettingsStore(state => state.skipKotCategories);
  const { data: currencySettings } = useCurrencySettings();

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

  // Helper to check if a line item should be skipped on KOT based on category
  const shouldSkipForKot = useMemo(
    () => createShouldSkipForKot(products, skipKotCategories),
    [products, skipKotCategories]
  );
  
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

      // Check if we're on a frontend ID URL (local-first order)
      const urlOrderId = params?.orderId as string | undefined;
      const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

      // For frontend ID orders - handle locally via Dexie
      if (isFrontendIdOrder && urlOrderId) {
        // Get the current local order from cache
        const cachedLocalOrder = queryClient.getQueryData<LocalOrder>(['localOrder', urlOrderId]);
        const baseOrder = cachedLocalOrder?.data || orderQuery.data;

        // Find existing line items for this product
        const existingLineItems = [...baseOrder.line_items];
        const existingIdx = existingLineItems.findIndex(
          li => li.product_id === productId && li.variation_id === variationId
        );

        // Calculate current quantity
        const currentQuantity = existingIdx >= 0 ? existingLineItems[existingIdx].quantity : 0;
        const newQuantity = mode === 'set' ? quantity : currentQuantity + quantity;

        // Update line items array
        if (existingIdx >= 0) {
          if (newQuantity > 0) {
            existingLineItems[existingIdx] = {
              ...existingLineItems[existingIdx],
              quantity: newQuantity,
              price: product.price,
            };
          } else {
            existingLineItems.splice(existingIdx, 1);
          }
        } else if (newQuantity > 0) {
          existingLineItems.push({
            name: product.name + (product.variation_name ? ` - ${product.variation_name}` : ''),
            product_id: productId,
            variation_id: variationId,
            quantity: newQuantity,
            price: product.price,
          });
        }

        // Save to Dexie (local only - no server call)
        const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
          line_items: existingLineItems,
        });

        // Update the cache directly
        queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);

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

  // Complete the order
  const handleCompleteOrder = useCallback(async () => {
    if (!orderQuery.data) throw new Error('No active order');

    const orderId = orderQuery.data.id;
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    if (isFrontendIdOrder && urlOrderId) {
      // Local-first flow: Mark order complete locally first
      const localOrder = await getLocalOrder(urlOrderId);
      if (!localOrder) {
        throw new Error('Local order not found');
      }

      // Update local order status to completed
      await updateLocalOrderStatus(urlOrderId, 'completed');

      // Invalidate local order query to reflect new status
      await queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });

      // Trigger sync attempt on completion (non-blocking)
      syncOrder(urlOrderId).then((result) => {
        if (result.success) {
          // Sync succeeded - invalidate queries to refresh with server data
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['localOrder', urlOrderId] });
          console.log(`Order ${urlOrderId} synced successfully with server ID ${result.serverId}`);
        } else {
          // Sync failed - order will be retried via background sync
          console.warn(`Order ${urlOrderId} sync failed: ${result.error}. Will retry automatically.`);
        }
      }).catch((error) => {
        console.error(`Unexpected error syncing order ${urlOrderId}:`, error);
      });
    } else {
      // Legacy flow for server-side orders: Update order status directly via API
      await OrdersAPI.updateOrder(orderId.toString(), { status: 'completed' });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    }

    // Navigate to next pending order or home
    const orders = ordersQuery.data || [];
    const nextOrder = orders.find(o => {
      // Skip the current order (check both orderId and urlOrderId)
      if (o.id === orderId) return false;
      // Also check if the order's frontend ID matches
      const orderFrontendId = o.meta_data?.find(m => m.key === 'pos_frontend_id')?.value;
      if (orderFrontendId === urlOrderId) return false;
      return o.status === 'pending';
    });

    if (nextOrder) {
      // Prefer using frontend ID if available
      const nextFrontendId = nextOrder.meta_data?.find(m => m.key === 'pos_frontend_id')?.value;
      if (nextFrontendId && typeof nextFrontendId === 'string') {
        router.push(`/orders/${nextFrontendId}`);
      } else {
        router.push(`/orders/${nextOrder.id}`);
      }
    } else {
      router.push('/');
    }
  }, [orderQuery, queryClient, ordersQuery, router, params]);

  // Set payment amount
  const handleSetPayment = useCallback(async (amount: number) => {
    if (!orderQuery.data) throw new Error('No active order');

    // Check if we're on a frontend ID URL (local-first order)
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // Get fresh order data
    const currentOrder = orderQuery.data;

    // Update meta_data with both split_payments (for UI) and payment_received (for legacy)
    const metaData = (currentOrder.meta_data || []).filter(
      m => m.key !== 'payment_received' && m.key !== 'split_payments'
    );
    metaData.push({ key: 'split_payments', value: JSON.stringify({ cash: amount }) });
    metaData.push({ key: 'payment_received', value: amount.toString() });

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, { meta_data: metaData });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
    const orderId = currentOrder.id;
    const orderQueryKey = ['orders', orderId, 'detail'];

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, meta_data: metaData });

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { meta_data: metaData });
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient, params]);

  // Get current payment received
  const getPaymentReceived = useCallback((): number => {
    if (!orderQuery.data) return 0;
    const paymentMeta = orderQuery.data.meta_data.find(m => m.key === 'payment_received');
    return paymentMeta ? parseFloat(String(paymentMeta.value)) : 0;
  }, [orderQuery.data]);

  // Apply coupon
  const handleApplyCoupon = useCallback(async (code: string) => {
    if (!orderQuery.data) throw new Error('No active order');

    // Check if we're on a frontend ID URL (local-first order)
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // For frontend ID orders - handle locally via Dexie
    // Note: Coupon validation should still be done against the server before applying
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
        coupon_lines: [{ code, discount: '0.00', discount_tax: '0.00' }],
      });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
    const orderId = orderQuery.data.id;

    // WooCommerce expects coupon_lines array
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
      coupon_lines: [{ code }]
    } as Partial<OrderSchema>);

    const orderQueryKey = ['orders', orderId, 'detail'];
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient, params]);

  // Remove coupon
  const handleRemoveCoupon = useCallback(async () => {
    if (!orderQuery.data) throw new Error('No active order');

    // Check if we're on a frontend ID URL (local-first order)
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
        coupon_lines: [],
      });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
    const orderId = orderQuery.data.id;

    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
      coupon_lines: []
    } as Partial<OrderSchema>);

    const orderQueryKey = ['orders', orderId, 'detail'];
    queryClient.setQueryData(orderQueryKey, updatedOrder);
  }, [orderQuery, queryClient, params]);

  // Print - uses print store queue
  const printStore = usePrintStore();

  const handlePrint = useCallback(async (type: 'bill' | 'kot') => {
    if (!orderQuery.data) throw new Error('No active order');

    // Check if we're on a frontend ID URL (local-first order)
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // For frontend ID orders, get fresh data from local cache
    // For server orders, use the orderQuery.data directly (already fresh from cache)
    let order = orderQuery.data;
    if (isFrontendIdOrder && urlOrderId) {
      const cachedLocalOrder = queryClient.getQueryData<LocalOrder>(['localOrder', urlOrderId]);
      if (cachedLocalOrder) {
        order = cachedLocalOrder.data;
      }
    }

    const orderId = order.id;

    // Build print data using shared utility
    const printData = buildPrintData({
      order,
      type,
      urlOrderId,
      shouldSkipForKot,
    });

    // Queue the print job
    await printStore.push(type, printData);

    // Build meta_data updates (only updates last_kot_items when there are actual changes)
    const metaUpdates = buildPrintMetaUpdates({ order, type, printData });

    // For frontend ID orders - save print meta_data to Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, { meta_data: metaUpdates });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // For server orders - save to server
    if (orderId !== DRAFT_ORDER_ID && orderId !== 0) {
      await OrdersAPI.updateOrder(orderId.toString(), {
        meta_data: metaUpdates
      });
    }
  }, [orderQuery, printStore, shouldSkipForKot, params, queryClient]);

  // Open cash drawer
  const handleOpenDrawer = useCallback(async () => {
    await printStore.push('drawer', null);
  }, [printStore]);

  // Set customer note
  const handleSetNote = useCallback(async (note: string) => {
    if (!orderQuery.data) throw new Error('No active order');

    // Check if we're on a frontend ID URL (local-first order)
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, { customer_note: note });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
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
  }, [orderQuery, queryClient, params]);

  // Set customer info
  const handleSetCustomer = useCallback(async (customer: CustomerData) => {
    if (!orderQuery.data) throw new Error('No active order');

    // Check if we're on a frontend ID URL (local-first order)
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    // Parse name into first and last
    const nameParts = customer.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const billing = {
      ...orderQuery.data.billing,
      first_name: firstName,
      last_name: lastName,
      phone: customer.phone,
      ...(customer.address && { address_1: customer.address })
    };

    // For frontend ID orders - handle locally via Dexie
    if (isFrontendIdOrder && urlOrderId) {
      const updatedLocalOrder = await updateLocalOrder(urlOrderId, { billing });
      queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);
      return;
    }

    // Legacy flow for server orders
    const orderId = orderQuery.data.id;
    const orderQueryKey = ['orders', orderId, 'detail'];
    const customerInfoKey = ['orders', orderId, 'customerInfo'];

    const currentOrder = queryClient.getQueryData<OrderSchema>(orderQueryKey) || orderQuery.data;

    // Optimistic update
    queryClient.setQueryData(orderQueryKey, { ...currentOrder, billing });
    queryClient.setQueryData(customerInfoKey, billing);

    // API call
    const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), { billing });
    queryClient.setQueryData(orderQueryKey, updatedOrder);
    queryClient.setQueryData(customerInfoKey, updatedOrder.billing);
  }, [orderQuery, queryClient, params]);

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
      applyCoupon: handleApplyCoupon,
      removeCoupon: handleRemoveCoupon,
      print: handlePrint,
      openDrawer: handleOpenDrawer,
      invalidateProducts: async () => {
        await queryClient.invalidateQueries({ queryKey: ['products'] });
      },
      setNote: handleSetNote,
      setCustomer: handleSetCustomer,
      getCurrency,
      showMessage: (msg) => console.log('[Command]', msg),
      showError: (err) => console.error('[Command Error]', err)
    };
  }, [orderQuery.data, products, handleAddProduct, handleClearOrder, handleCompleteOrder, handleSetPayment, getPaymentReceived, handleApplyCoupon, handleRemoveCoupon, handlePrint, handleOpenDrawer, handleSetNote, handleSetCustomer, getCurrency, queryClient]);

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
    </div>
  );
}