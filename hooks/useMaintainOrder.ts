import { useMemo, useRef } from "react";

/**
 * Retain the order of shuffling array items between renders.
 *
 * Uses useMemo + useRef instead of useState + useEffect to avoid
 * a one-frame delay where stale data would briefly render.
 *
 * @param items - The items to maintain the order of.
 * @param compare - A function that compares two items and returns true if they are the same.
 * @returns The ordered items.
 */
export const useMaintainOrder = <T>(items: T[], compare: (a: T, b: T) => boolean) => {
    const prevOrderedRef = useRef<T[]>([]);
    // Use ref to avoid re-running memo when compare function reference changes
    const compareRef = useRef(compare);
    compareRef.current = compare;

    return useMemo(() => {
        if (!items || items.length === 0) {
            prevOrderedRef.current = [];
            return prevOrderedRef.current;
        }

        const prevOrdered = prevOrderedRef.current;
        if (prevOrdered.length === 0) {
            prevOrderedRef.current = items;
            return prevOrderedRef.current;
        }

        const currentCompare = compareRef.current;

        // Map existing ordered items to their updated versions, preserving order
        const result: T[] = [];
        for (const oldItem of prevOrdered) {
            const newItem = items.find(item => currentCompare(oldItem, item));
            if (newItem) {
                result.push(newItem);
            }
        }

        // Append any new items not in the previous order
        for (const item of items) {
            if (!result.find(r => currentCompare(r, item))) {
                result.push(item);
            }
        }

        prevOrderedRef.current = result;
        return prevOrderedRef.current;
    }, [items]);
};
