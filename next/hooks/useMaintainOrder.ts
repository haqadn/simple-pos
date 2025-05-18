import { useEffect, useState } from "react";

/**
 * Retain the order of shuffling array items between renders.
 * 
 * @param items - The items to maintain the order of.
 * @param compare - A function that compares two items and returns true if they are the same.
    * @returns The ordered items.
 */
export const useMaintainOrder = <T>(items: T[], compare: (a: T, b: T) => boolean) => {
    const [orderedItems, setOrderedItems] = useState<T[]>(items ?? []);

    useEffect(() => {
        if (!items) return;
        
        const newItemsList: (T | undefined)[] = orderedItems.map((eli) => {
                const newLI = items.find((nli) => compare(eli, nli));
                if (newLI) {
                    return { ...newLI };
                } else {
                    return undefined;
                }
            });
        
        items.forEach((li: T) => {
            if (!newItemsList.find((nli) => nli && compare(li, nli))) {
                newItemsList.push(li);
            }
        });

        setOrderedItems(newItemsList.filter((li) => li !== undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    return orderedItems;
}