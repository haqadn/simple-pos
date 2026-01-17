import { QueryClient } from "@tanstack/react-query";
import { UseMutationResult } from "@tanstack/react-query";

/**
 * Custom error types used by useDebounce and useAvoidParallel hooks.
 * These errors indicate the mutation was intentionally skipped, not failed.
 */
export const DEBOUNCE_ERROR = 'debounce';
export const NEWER_CALL_ERROR = 'newer-call';

/**
 * Checks if an error is a "skip" error from debounce or avoid-parallel hooks.
 * These errors indicate the mutation was intentionally skipped, not that it failed.
 */
export function isSkipError(err: unknown): boolean {
  const errString = String(err);
  return errString === NEWER_CALL_ERROR || errString === DEBOUNCE_ERROR;
}

/**
 * Creates a standardized error handler for mutations that use debounce/avoid-parallel.
 *
 * When a mutation fails (but NOT due to debounce/newer-call), this handler:
 * 1. Invalidates the order queries to refresh data from the server
 * 2. Resets the mutation state
 *
 * @param queryClient - The React Query client
 * @param orderRootKey - The query key for the order (e.g., ['orders', orderId])
 * @param mutation - The mutation result object with reset() method
 */
export function createMutationErrorHandler(
  queryClient: QueryClient,
  orderRootKey: readonly unknown[],
  mutation: Pick<UseMutationResult<unknown, unknown, unknown, unknown>, 'reset'>
) {
  return (err: unknown) => {
    if (!isSkipError(err)) {
      queryClient.invalidateQueries({ queryKey: orderRootKey });
      mutation.reset();
    }
  };
}
