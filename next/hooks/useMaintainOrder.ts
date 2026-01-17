import { useEffect, useRef, useState } from "react";

/**
 * Retain the order of shuffling array items between renders.
 *
 * @param items - The items to maintain the order of.
 * @param compare - A function that compares two items and returns true if they are the same.
 * @returns The ordered items.
 */
export const useMaintainOrder = <T>(items: T[], compare: (a: T, b: T) => boolean) => {
    const [orderedItems, setOrderedItems] = useState<T[]>(items ?? []);
    // Use ref to avoid re-running effect when compare function reference changes
    const compareRef = useRef(compare);
    compareRef.current = compare;

    useEffect(() => {
        if (!items || items.length === 0) {
            setOrderedItems(prevOrdered => prevOrdered.length > 0 ? [] : prevOrdered);
            return;
        }

        setOrderedItems(prevOrdered => {
            if (prevOrdered.length === 0) {
                return items;
            }

            const currentCompare = compareRef.current;
            const newItemsList: (T | undefined)[] = prevOrdered.map((eli) => {
                const newLI = items.find((nli) => currentCompare(eli, nli));
                if (newLI) {
                    return { ...newLI };
                } else {
                    return undefined;
                }
            });

            items.forEach((li: T) => {
                if (!newItemsList.find((nli) => nli && currentCompare(li, nli))) {
                    newItemsList.push(li);
                }
            });

            return newItemsList.filter((li): li is T => li !== undefined);
        });
    }, [items]);

    return orderedItems;
}