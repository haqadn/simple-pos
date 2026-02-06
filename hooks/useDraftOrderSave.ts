import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import OrdersAPI, { OrderSchema } from '@/api/orders';
import { useDraftOrderState, useDraftOrderActions } from './useDraftOrderState';
import { DRAFT_ORDER_ID } from '@/stores/draft-order';

/**
 * Hook to save a draft order to the database.
 * Simple version - just saves and navigates. For mutations that don't need
 * to coordinate with other concurrent mutations.
 */
export function useSaveDraftOrder() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { getDraftData } = useDraftOrderState();
	const { resetDraft } = useDraftOrderActions();

	const saveDraft = useCallback(async (additionalData?: Partial<OrderSchema>) => {
		const draftData = getDraftData();
		const orderData = { ...draftData, ...additionalData, status: 'pending' };

		try {
			const savedOrder = await OrdersAPI.saveOrder(orderData);
			if (savedOrder) {
				await queryClient.invalidateQueries({ queryKey: ['orders'] });
				resetDraft();
				router.replace(`/orders/${savedOrder.id}`);
				return savedOrder;
			}
		} catch (error) {
			console.error('Failed to save draft order:', error);
			throw error;
		}
		return null;
	}, [getDraftData, resetDraft, queryClient, router]);

	return saveDraft;
}

type OrderDataBuilder = (draftData: Partial<OrderSchema>) => Partial<OrderSchema>;

interface EnsureDraftSavedOptions {
	/** Build the order data to save. Receives draft data, returns data to save. */
	buildOrderData?: OrderDataBuilder;
	/** Callback to run after order is saved (e.g., to update with additional data) */
	afterSave?: (savedOrder: OrderSchema) => Promise<OrderSchema>;
}

/**
 * Hook to ensure a draft order is saved to the database.
 * Handles concurrent mutation coordination via lock/promise management.
 *
 * Use this when you have multiple mutations that might try to save the draft
 * at the same time (e.g., adding item + setting table simultaneously).
 */
export function useEnsureDraftSaved() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const {
		getDraftData,
		getSavePromise,
		setSavePromise,
		getSavedOrderId,
		setSavedOrderId,
		acquireSaveLock,
		releaseSaveLock,
	} = useDraftOrderState();

	/**
	 * Ensures the draft order is saved to the database.
	 * Returns the saved order, handling concurrent save attempts via locking.
	 *
	 * @param options.buildOrderData - Function to build order data from draft
	 * @param options.afterSave - Callback to run after save (e.g., update with more data)
	 */
	const ensureSaved = useCallback(async (options: EnsureDraftSavedOptions = {}): Promise<OrderSchema> => {
		const { buildOrderData, afterSave } = options;

		// Check if order was already saved by another mutation
		const alreadySavedId = getSavedOrderId();
		if (alreadySavedId) {
			const order = await OrdersAPI.getOrder(alreadySavedId.toString());
			if (!order) throw new Error('Failed to get saved order');

			// Run afterSave callback if provided
			if (afterSave) {
				return afterSave(order);
			}
			return order;
		}

		// Try to acquire the save lock
		const gotLock = acquireSaveLock();

		if (!gotLock) {
			// Another save is in progress, wait for it
			const existingPromise = getSavePromise();
			if (existingPromise) {
				const savedOrder = await existingPromise;
				if (savedOrder) {
					// Run afterSave callback if provided
					if (afterSave) {
						return afterSave(savedOrder);
					}
					return savedOrder;
				}
			}

			// Check again if saved while waiting
			const savedId = getSavedOrderId();
			if (savedId) {
				const order = await OrdersAPI.getOrder(savedId.toString());
				if (!order) throw new Error('Failed to get saved order');

				if (afterSave) {
					return afterSave(order);
				}
				return order;
			}
			throw new Error('Failed to get saved order after waiting');
		}

		// We have the lock - create and save the order
		const savePromise = (async () => {
			const draftData = getDraftData();
			const orderData = buildOrderData
				? buildOrderData(draftData)
				: {
					status: 'pending',
					line_items: draftData.line_items,
					shipping_lines: draftData.shipping_lines,
					customer_note: draftData.customer_note,
					billing: draftData.billing,
					meta_data: draftData.meta_data,
				};

			const savedOrder = await OrdersAPI.saveOrder({
				status: 'pending',
				...orderData,
			});
			return savedOrder;
		})();

		setSavePromise(savePromise);

		try {
			const savedOrder = await savePromise;

			if (savedOrder) {
				setSavedOrderId(savedOrder.id);
				await queryClient.invalidateQueries({ queryKey: ['orders'] });
				router.replace(`/orders/${savedOrder.id}`);
				return savedOrder;
			}
			throw new Error('Failed to save draft order');
		} finally {
			releaseSaveLock();
		}
	}, [
		getDraftData,
		getSavePromise,
		setSavePromise,
		getSavedOrderId,
		setSavedOrderId,
		acquireSaveLock,
		releaseSaveLock,
		queryClient,
		router,
	]);

	return ensureSaved;
}

/**
 * Check if an order is a draft order
 */
export function isDraftOrder(order: OrderSchema | null | undefined): boolean {
	return order?.id === DRAFT_ORDER_ID;
}
