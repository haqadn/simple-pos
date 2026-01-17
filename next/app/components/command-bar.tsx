'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Input } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { useCommandManager } from '@/hooks/useCommandManager';
import { useCurrentOrder, useOrdersStore } from '@/stores/orders';
import { useProductsQuery, useGetProductById } from '@/stores/products';
import { usePrintStore, PrintJobData } from '@/stores/print';
import { CommandContext, CustomerData } from '@/commands/command-manager';
import { CommandSuggestion } from '@/commands/command';
import OrdersAPI, { OrderSchema } from '@/api/orders';
import { DRAFT_ORDER_ID, useDraftOrderStore } from '@/stores/draft-order';
import { useDraftOrderState } from '@/hooks/useDraftOrderState';
import { useSettingsStore } from '@/stores/settings';
import { isAppShortcut } from '@/lib/shortcuts';
import { createShouldSkipForKot } from '@/lib/kot';
import { HelpTextBar, CommandSuggestions, applySuggestion } from './command-bar/index';
import { isValidFrontendId } from '@/lib/frontend-id';
import { updateLocalOrderStatus, getLocalOrder } from '@/stores/offline-orders';
import { syncOrder } from '@/services/sync';

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

      // Handle draft order - save to database first
      if (orderId === DRAFT_ORDER_ID) {
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

      // Prepare line items for the update (real order)
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
  }, [orderQuery, getProductById, queryClient, router, updateDraftLineItems, getDraftData, acquireSaveLock, releaseSaveLock, getSavePromise, setSavePromise, getSavedOrderId, setSavedOrderId]);

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

    // Wait for mutations and use fresh data for both bill (correct totals) and KOT (change detection)
    const order = (await waitForMutationsRef.current?.()) ?? orderQuery.data;
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
    // Preserve existing meta IDs to ensure WooCommerce updates rather than creates duplicates
    const metaKey = type === 'bill' ? 'last_bill_print' : 'last_kot_print';
    const existingPrintMeta = order.meta_data.find(m => m.key === metaKey);
    const metaUpdates = [
      ...order.meta_data.filter(m => m.key !== metaKey && m.key !== 'last_kot_items'),
      existingPrintMeta?.id
        ? { id: existingPrintMeta.id, key: metaKey, value: new Date().toISOString() }
        : { key: metaKey, value: new Date().toISOString() }
    ];

    // For KOT, also save current items for next change detection (with names for removed item display)
    if (type === 'kot') {
      const currentItems: Record<string, { quantity: number; name: string }> = {};
      order.line_items.forEach(item => {
        const itemKey = `${item.product_id}-${item.variation_id}`;
        currentItems[itemKey] = { quantity: item.quantity, name: item.name };
      });
      // Preserve existing last_kot_items id if it exists
      const existingKotMeta = order.meta_data.find(m => m.key === 'last_kot_items');
      if (existingKotMeta?.id) {
        metaUpdates.push({ id: existingKotMeta.id, key: 'last_kot_items', value: JSON.stringify(currentItems) });
      } else {
        metaUpdates.push({ key: 'last_kot_items', value: JSON.stringify(currentItems) });
      }
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