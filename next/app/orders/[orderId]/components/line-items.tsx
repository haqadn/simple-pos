'use client'

import { useCurrentOrderQuery, useLineItemQuery } from "@/stores/orders";
import { NumberInput, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { LineItemSchema, OrderSchema } from "@/api/orders";
import { useGetProductById } from "@/stores/products";

export default function LineItems() {
    const { data: order } = useCurrentOrderQuery();
    const lineItems = order?.line_items;

    return (
        <Table 
            className="my-4"
            aria-label="Order line items"
        >
            <TableHeader>
                <TableColumn>Product</TableColumn>
                <TableColumn>Quantity</TableColumn>
            </TableHeader>
            <TableBody>
                {(lineItems ?? []).map((lineItem: LineItemSchema) => (
                    <TableRow key={lineItem.id}>
                        <TableCell>
                            <span className="mr-2">{lineItem.name}</span>
                        </TableCell>
                        <TableCell>
                            <LineItemQuantity lineItem={lineItem} order={order!} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

const LineItemQuantity = ({ lineItem, order }: { lineItem: LineItemSchema, order: OrderSchema }) => {
    const getProductById = useGetProductById();
    const product = getProductById(lineItem.product_id, lineItem.variation_id);

    const [query, mutation, isMutating] = useLineItemQuery(order, product);
    
    return (
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
    );
}
