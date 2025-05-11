import { useCallback, useRef } from 'react';

export function useDebounce<Args extends unknown[], Return>(
    callback: (...args: Args) => Return | Promise<Return>,
    delay: number = 300
): (...args: Args) => Promise<Return> {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    return useCallback(
        (...args: Args) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            return new Promise<Return>((resolve) => {
                timeoutRef.current = setTimeout(async () => {
                    const result = await callback(...args);
                    resolve(result);
                }, delay);
            });
        },
        [callback, delay]
    );
} 