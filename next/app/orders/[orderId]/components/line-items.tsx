'use client'

import { useCurrentOrderQuery, useSetOrderLineItem } from "@/stores/orders";
import { NumberInput, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { LineItemSchema } from "@/api/orders";
import { useGetProductById } from "@/stores/products";

export default function LineItems() {
    const { data: order } = useCurrentOrderQuery();
    const lineItems = order?.line_items;

    const setLineItem = useSetOrderLineItem();
    const getProductById = useGetProductById();
    
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
                    <TableRow key={`${lineItem.id}-${lineItem.product_id}-${lineItem.variation_id}`}>
                        <TableCell>
                            <span className="mr-2">{lineItem.name}</span>
                        </TableCell>
                        <TableCell>
                            <NumberInput 
                                value={lineItem.quantity} 
                                aria-label="Quantity of line item"
                                onChange={(e) => {
                                    const product = getProductById(lineItem.product_id, lineItem.variation_id);
                                    if (!product) return;
                                    const quantity = typeof e === 'number' ? e : Number(e.target.value);
                                    setLineItem.mutate({ product, quantity });
                                }}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}