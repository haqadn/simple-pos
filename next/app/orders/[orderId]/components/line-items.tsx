'use client'

import { useMemo } from "react";
import { useCurrentOrder, useLineItemQuery } from "@/stores/orders";
import { NumberInput, ScrollShadow } from "@heroui/react";
import { LineItemSchema } from "@/api/orders";
import { useGetProductById } from "@/stores/products";
import { useMaintainOrder } from "@/hooks/useMaintainOrder";

export default function LineItems() {
    const { data: order } = useCurrentOrder();

    // Filter out items with quantity 0 or less - memoize to avoid new array on every render
    const lineItems = useMemo(() =>
        (order?.line_items ?? []).filter(li => li.quantity > 0),
        [order?.line_items]
    );

    const orderedLineItems = useMaintainOrder(lineItems, (a, b) => a.product_id === b.product_id && a.variation_id === b.variation_id);
    return (
            <ScrollShadow className="-my-4 py-4 overflow-x-hidden" orientation="vertical">
                <table
                    className="w-full table-fixed"
                    aria-label="Order line items"
                >
                    <tbody>
                        {orderedLineItems.map((lineItem: LineItemSchema) => (
                            <LineItemRow key={`${lineItem.product_id}-${lineItem.variation_id}`} lineItem={lineItem} />
                        ))}
                    </tbody>
                </table>
            </ScrollShadow>

    );
}

const LineItemRow = ({ lineItem }: { lineItem: LineItemSchema }) => {
    const getProductById = useGetProductById();
    const product = getProductById(lineItem.product_id, lineItem.variation_id);
    const orderQuery = useCurrentOrder();

    const [query, mutation, isMutating] = useLineItemQuery(orderQuery, product);

    // Hide if quantity becomes 0 (filtered at source, but double-check for real-time updates)
    const quantity = query.data?.quantity ?? lineItem.quantity;
    if (quantity <= 0 && !isMutating) {
        return null;
    }

    return (
        <tr key={lineItem.id}>
            <td className="p-1 w-3/4 text-sm truncate">
                <span title={lineItem.name}>{lineItem.name}</span>
            </td>
            <td className="p-1 w-1/4 text-sm overflow-hidden">
                    <NumberInput
                        size="sm"
                        variant="underlined"
                        labelPlacement="outside-left"
                        min={0}
                        color={isMutating ? 'warning' : 'default'}
                        value={query.data?.quantity} 
                        aria-label="Quantity of line item"
                        onValueChange={(quantity) => {
                            if (!product) {
                                console.error('Product not found');
                                return;
                            }

                            if (quantity < 0) {
                                quantity = 0;
                            }

                            if ( quantity !== query.data?.quantity ) {
                                mutation.mutate({ quantity });
                            }
                        }}
                    />
            </td>
        </tr>
    );
}
