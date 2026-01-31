import { useCallback, useRef } from 'react';

/**
 * Avoid parallel calls to a function and instead chain them with one active and one pending at most.
 * It is used to avoid race conditions between mutations.
 *
 * @param callback - The function to call. The first argument should be the same type as the return value as that is passed on to the pending call.
 * @returns A function that can be called to call the function.
 */
export const useAvoidParallel = <Args extends unknown[], T>(callback: (input: T,...args: Args) => Promise<T>) => {
    const currentPromise = useRef<Promise<T> | null>(null);
    const queuedCall = useRef<{ args: Args; resolve: (value: T) => void; reject: (reason: unknown) => void } | null>(null);
    const state = useRef<T | null>(null);

    return useCallback(
        async (input: T, ...args: Args): Promise<T> => {
            state.current = input;

            // If there's already a call in progress
            if (currentPromise.current) {
                // If there's already a queued call, reject it
                if (queuedCall.current) {
                    queuedCall.current.reject('newer-call');
                }

                // Queue this new call
                return new Promise<T>((resolve, reject) => {
                    queuedCall.current = { args, resolve, reject };
                });
            }

            // No call in progress, execute immediately
            const execute = async (execArgs: Args): Promise<T> => {
                currentPromise.current = callback(state.current as T, ...execArgs);
                try {
                    const result = await currentPromise.current;
                    state.current = result;
                    return result;
                } finally {
                    currentPromise.current = null;
                }
            };

            try {
                return await execute(args);
            } finally {
                // Drain the queue — keep currentPromise set during each
                // queued execution so new arrivals get queued, not run in parallel.
                while (queuedCall.current) {
                    const { args: queuedArgs, resolve, reject } = queuedCall.current;
                    queuedCall.current = null;
                    try {
                        resolve(await execute(queuedArgs));
                    } catch (error) {
                        reject(error);
                    }
                }
            }
        },
        [callback]
    );
};
