'use client'

import { useCurrentOrder, useLineItemQuery } from "@/stores/orders";
import { NumberInput } from "@heroui/react";
import { LineItemSchema } from "@/api/orders";
import { useGetProductById } from "@/stores/products";
import { useMaintainOrder } from "@/hooks/useMaintainOrder";

export default function LineItems() {
    const { query: { data: order } } = useCurrentOrder();
    const lineItems = order?.line_items ?? [];

    const orderedLineItems = useMaintainOrder(lineItems, (a, b) => a.product_id === b.product_id && a.variation_id === b.variation_id);
    return (
            <table 
                className="w-full"
                aria-label="Order line items"
            >
                <thead>
                    <tr className="w-full group/tr outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2">
                        <th className="p-2 group/th px-3 h-10 align-middle bg-default-100 whitespace-nowrap text-foreground-500 text-tiny font-semibold first:rounded-s-lg last:rounded-e-lg data-[sortable=true]:cursor-pointer data-[hover=true]:text-foreground-400 outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-start">Product</th>
                        <th className="p-2 group/th px-3 h-10 align-middle bg-default-100 whitespace-nowrap text-foreground-500 text-tiny font-semibold first:rounded-s-lg last:rounded-e-lg data-[sortable=true]:cursor-pointer data-[hover=true]:text-foreground-400 outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-start">Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    {orderedLineItems.map((lineItem: LineItemSchema) => (
                        <LineItemRow key={`${lineItem.product_id}-${lineItem.variation_id}`} lineItem={lineItem} />
                    ))}
                </tbody>
            </table>
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
