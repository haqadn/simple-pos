'use client'

import { useCurrentOrderQuery, useLineItemQuery } from "@/stores/orders";
import { Card, CardBody, NumberInput } from "@heroui/react";
import { LineItemSchema, OrderSchema } from "@/api/orders";
import { useGetProductById } from "@/stores/products";

export default function LineItems() {
    const { data: order } = useCurrentOrderQuery();
    const lineItems = order?.line_items;

    return (
        <Card className="my-4">
            <CardBody>
                <table 
                    aria-label="Order line items"
                >
                    <thead>
                        <tr className="group/tr outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2">
                            <th className="p-2 group/th px-3 h-10 align-middle bg-default-100 whitespace-nowrap text-foreground-500 text-tiny font-semibold first:rounded-s-lg last:rounded-e-lg data-[sortable=true]:cursor-pointer data-[hover=true]:text-foreground-400 outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-start">Product</th>
                            <th className="p-2 group/th px-3 h-10 align-middle bg-default-100 whitespace-nowrap text-foreground-500 text-tiny font-semibold first:rounded-s-lg last:rounded-e-lg data-[sortable=true]:cursor-pointer data-[hover=true]:text-foreground-400 outline-none data-[focus-visible=true]:z-10 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-focus data-[focus-visible=true]:outline-offset-2 text-start">Quantity</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(lineItems ?? []).map((lineItem: LineItemSchema) => (
                            <LineItemRow key={lineItem.id} lineItem={lineItem} order={order!} />
                        ))}
                    </tbody>
                </table>
            </CardBody>
        </Card>
    );
}

const LineItemRow = ({ lineItem, order }: { lineItem: LineItemSchema, order: OrderSchema }) => {
    const getProductById = useGetProductById();
    const product = getProductById(lineItem.product_id, lineItem.variation_id);

    const [query, mutation, isMutating] = useLineItemQuery(order, product);

    if ( !isMutating && query.data?.quantity === 0 ) {
        return null;
    }
    
    return (
        <tr key={lineItem.id}>
            <td className="p-2 w-3/4">
                <span>{lineItem.name}</span>
            </td>
            <td className="p-2 w-1/4">
                    <NumberInput
                        size="sm"
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

                        mutation.mutate({ product, quantity });
                        }}
                    />
            </td>
        </tr>
    );
}
