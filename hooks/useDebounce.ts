import { useCallback, useRef } from 'react';

export function useDebounce<Args extends unknown[], Return>(
    callback: (...args: Args) => Return | Promise<Return>,
    delay: number = 300
): (...args: Args) => Promise<Return> {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const rejectRef = useRef<((reason?: string) => void) | undefined>(undefined);
    const disableDebounce = (
        (typeof globalThis !== 'undefined' && (globalThis as { __E2E_DISABLE_DEBOUNCE__?: boolean }).__E2E_DISABLE_DEBOUNCE__ === true) ||
        process.env.NEXT_PUBLIC_DISABLE_DEBOUNCE === '1'
    );
    const effectiveDelay = disableDebounce ? 0 : delay;

    return useCallback(
        (...args: Args) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                rejectRef.current?.( 'debounce' );
            }

            return new Promise<Return>((resolve, reject) => {
                timeoutRef.current = setTimeout(async () => {
                    const result = await callback(...args);
                    resolve(result);
                }, effectiveDelay);
                rejectRef.current = reject;
            });
        },
        [callback, effectiveDelay]
    );
}
