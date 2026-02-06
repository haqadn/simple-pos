import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import OrdersAPI from "@/api/orders";
import { upsertServerOrders } from "./offline-orders";

/**
 * Background server sync.
 * Fetches orders from WooCommerce periodically and upserts them into Dexie.
 * This is not a query -- it's a side effect that keeps Dexie in sync with the server.
 * Mount once at app root.
 */
export const useServerSync = () => {
	const queryClient = useQueryClient();

	useEffect(() => {
		let active = true;

		const sync = async () => {
			try {
				const serverOrders = await OrdersAPI.listOrders({
					'per_page': '100',
					'status': 'pending,processing,on-hold',
					'orderby': 'date',
					'order': 'asc',
				});
				if (!active) return;
				await upsertServerOrders(serverOrders);
				queryClient.invalidateQueries({ queryKey: ['orders'] });
			} catch {
				// Offline or error -- no-op, Dexie has local data
			}
		};

		sync();
		const interval = setInterval(sync, 60_000);
		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [queryClient]);
};
