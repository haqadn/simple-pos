'use client'

import { useCurrentOrder, useLineItemQuery } from "@/stores/orders";
import { NumberInput, ScrollShadow } from "@heroui/react";
import { LineItemSchema } from "@/api/orders";
import { useGetProductById } from "@/stores/products";
import { useMaintainOrder } from "@/hooks/useMaintainOrder";

export default function LineItems() {
    const { query: { data: order } } = useCurrentOrder();
    const lineItems = order?.line_items ?? [];

    const orderedLineItems = useMaintainOrder(lineItems, (a, b) => a.product_id === b.product_id && a.variation_id === b.variation_id);
    return (
            <ScrollShadow className="-my-4 py-4">
                <table 
                    className="w-full"
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
    const { query: orderQuery } = useCurrentOrder();

    const [query, mutation, isMutating] = useLineItemQuery(orderQuery, product);

    if ( !isMutating && query.data?.quantity === 0 ) {
        return null;
    }
    
    return (
        <tr key={lineItem.id}>
            <td className="p-1 w-3/4 text-sm">
                <span>{lineItem.name}</span>
            </td>
            <td className="p-1 w-1/4 text-sm">
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
