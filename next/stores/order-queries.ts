import OrdersAPI, { OrderSchema } from "@/api/orders";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ProductSchema } from "./products";
import { DRAFT_ORDER_ID } from "./draft-order";
import { useDraftOrderState } from "@/hooks/useDraftOrderState";
import { useEffect } from "react";
import { isValidFrontendId } from "@/lib/frontend-id";
import { getLocalOrder, getLocalOrderByServerId, listLocalOrders } from "./offline-orders";
import type { LocalOrder } from "@/db";

export function generateOrderQueryKey(context: string, order?: OrderSchema, product?: ProductSchema) {
	switch (context) {
		case 'detail':
			return ['orders', order?.id, 'detail'];
		case 'lineItem':
			if ( !product ) {
				return ['orders', order?.id, 'lineItem'];
			}
			return ['orders', order?.id, 'lineItem', product?.product_id, product?.variation_id];
		case 'service':
			return ['orders', order?.id, 'service'];
		case 'note':
			return ['orders', order?.id, 'note'];
		case 'customerInfo':
			return ['orders', order?.id, 'customerInfo'];
		case 'payment':
			return ['orders', order?.id, 'payment'];
		case 'order':
			return ['orders', order?.id];
		case 'list':
		default:
			return ['orders'];
	}
}

/**
 * Extended order type that includes the frontend ID for local orders
 */
export interface OrderWithFrontendId extends OrderSchema {
	frontendId?: string;
}

/**
 * Single source of truth for the orders list.
 * Reads from Dexie (local database) which contains both locally-created
 * orders and server orders imported by the background sync.
 */
export const useOrdersQuery = () => {
	const query = useQuery<OrderWithFrontendId[]>({
		queryKey: ['orders'],
		queryFn: async () => {
			const localOrders = await listLocalOrders({
				status: ['pending', 'processing', 'on-hold', 'draft'],
			});
			return localOrders.map(lo => ({
				...lo.data,
				frontendId: lo.frontendId,
			}));
		},
		staleTime: 5000,
	});

	return {
		ordersQuery: query,
		isLoading: query.isLoading,
	};
};

export const useOrderQuery = ( orderId: number ) => {
	const queryKey = generateOrderQueryKey('detail', undefined);

	return useQuery<OrderSchema | null>({
		queryKey,
		queryFn: async () => {
			if (!orderId) {
				return null;
			}

			// Check local Dexie database first for this server ID
			const localOrder = await getLocalOrderByServerId(orderId);
			if (localOrder) {
				// Return the local order data
				return localOrder.data;
			}

			// Fall back to server query if not in local DB
			const order = await OrdersAPI.getOrder(orderId.toString());
			if (!order) {
				return null;
			}
			return order;
		},
		initialData: null,
		staleTime: 60 * 1000,
	});

}

export const useCurrentOrder = () => {
	const params = useParams();
	const router = useRouter();
	const orderId = params?.orderId as string | undefined;
	const { draftOrder, currentFrontendId, setCurrentFrontendId } = useDraftOrderState();

	// Check if this is a frontend ID (6-char alphanumeric)
	const isFrontendId = orderId ? isValidFrontendId(orderId) : false;

	// Check if this is a numeric server ID
	const isServerId = orderId ? /^\d+$/.test(orderId) : false;

	// For legacy 'new' route, return draft data from store
	const isLegacyNew = orderId === 'new';

	// Use DRAFT_ORDER_ID for new orders or undefined orderId
	const queryOrderId = isLegacyNew || isFrontendId || !orderId ? DRAFT_ORDER_ID : parseInt(orderId);
	const orderQuery = useOrderQuery(queryOrderId);

	// Query for local order data from Dexie when using frontend ID
	const localOrderQuery = useQuery<LocalOrder | undefined>({
		queryKey: ['localOrder', orderId],
		queryFn: async () => {
			if (!orderId || !isFrontendId) return undefined;
			return await getLocalOrder(orderId);
		},
		enabled: isFrontendId && !!orderId,
		staleTime: 1000,
	});

	// Query for local order by server ID (to redirect server ID URLs to frontend ID)
	const localOrderByServerIdQuery = useQuery<LocalOrder | undefined>({
		queryKey: ['localOrderByServerId', orderId],
		queryFn: async () => {
			if (!orderId || !isServerId) return undefined;
			return await getLocalOrderByServerId(parseInt(orderId));
		},
		enabled: isServerId && !!orderId,
		staleTime: 1000,
	});

	// Sync frontend ID to Zustand store when navigating to a frontend ID URL
	useEffect(() => {
		if (isFrontendId && orderId && orderId !== currentFrontendId) {
			setCurrentFrontendId(orderId);
		}
	}, [isFrontendId, orderId, currentFrontendId, setCurrentFrontendId]);

	// Redirect server ID URLs to frontend ID URLs if order exists locally
	useEffect(() => {
		if (isServerId && localOrderByServerIdQuery.isSuccess && localOrderByServerIdQuery.data) {
			// Order exists locally - redirect to frontend ID URL
			router.replace(`/orders/${localOrderByServerIdQuery.data.frontendId}`);
		}
	}, [isServerId, localOrderByServerIdQuery.isSuccess, localOrderByServerIdQuery.data, router]);

	useEffect(() => {
		const redirectToFirstOrder = async () => {
			const orders = await listLocalOrders({
				status: ['pending', 'processing', 'on-hold', 'draft'],
				limit: 1,
			});
			if (orders.length > 0) {
				router.replace(`/orders/${orders[0].frontendId}`);
			} else {
				router.replace('/orders');
			}
		};

		// Redirect if orderId is not a valid format (not a frontend ID, server ID, or 'new')
		if (orderId && !isLegacyNew && !isFrontendId && !isServerId) {
			redirectToFirstOrder();
			return;
		}
		// Redirect to first order if order not found (for server IDs)
		if (!isLegacyNew && isServerId && orderId && orderQuery.isSuccess && orderQuery.data === null && localOrderByServerIdQuery.isSuccess && !localOrderByServerIdQuery.data) {
			redirectToFirstOrder();
		}
		// Redirect to first order if local order not found (for frontend IDs)
		if (isFrontendId && localOrderQuery.isSuccess && !localOrderQuery.data) {
			redirectToFirstOrder();
		}
	}, [isLegacyNew, isFrontendId, isServerId, orderId, orderQuery.data, orderQuery.isSuccess, localOrderQuery.data, localOrderQuery.isSuccess, localOrderByServerIdQuery.data, localOrderByServerIdQuery.isSuccess, router]);

	// If it's a frontend ID, return local order data
	if (isFrontendId && localOrderQuery.data) {
		return {
			...orderQuery,
			data: localOrderQuery.data.data,
			isLoading: localOrderQuery.isLoading,
			isPending: localOrderQuery.isPending,
			isSuccess: localOrderQuery.isSuccess,
			isError: localOrderQuery.isError,
			status: localOrderQuery.status,
			error: localOrderQuery.error,
		} as typeof orderQuery;
	}

	// If it's a server ID URL and the order exists locally, return local order data
	// (while waiting for redirect to frontend ID URL)
	if (isServerId && localOrderByServerIdQuery.data) {
		return {
			...orderQuery,
			data: localOrderByServerIdQuery.data.data,
			isLoading: false,
			isPending: false,
			isSuccess: true,
			isError: false,
			status: 'success',
			error: null,
		} as typeof orderQuery;
	}

	// If it's a legacy 'new' route or frontend ID being loaded, return draft data
	if (isLegacyNew || !orderId || (isFrontendId && localOrderQuery.isLoading)) {
		// Cast to match the expected QueryObserverResult type
		return {
			...orderQuery,
			data: draftOrder,
			isLoading: isFrontendId && localOrderQuery.isLoading,
			isPending: isFrontendId && localOrderQuery.isPending,
			isSuccess: true,
			isError: false,
			status: 'success',
			error: null,
		} as typeof orderQuery;
	}

	return orderQuery;
}

export const useIsDraftOrder = () => {
	const params = useParams();
	const orderId = params.orderId as string;
	// Consider both legacy 'new' and frontend IDs (6-char alphanumeric) as draft orders
	return orderId === 'new' || isValidFrontendId(orderId);
}

// Re-export from hooks for backward compatibility
export { useSaveDraftOrder } from '@/hooks/useDraftOrderSave';
