import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { isValidFrontendId } from '@/lib/frontend-id';

/**
 * Shared hook that extracts and validates the order ID from the URL.
 *
 * Every command handler needs to know:
 * - The raw URL order ID (string | undefined)
 * - Whether it is a frontend-ID (local-first) order
 *
 * Centralising this avoids duplicating the same 3 lines in every handler.
 */
export function useOrderRouteInfo() {
  const params = useParams();

  return useMemo(() => {
    const urlOrderId = params?.orderId as string | undefined;
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;
    return { urlOrderId, isFrontendIdOrder };
  }, [params]);
}
