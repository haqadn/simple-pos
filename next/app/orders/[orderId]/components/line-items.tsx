'use client'

import { useCurrentOrderQuery } from "@/stores/orders";
import { NumberInput, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { LineItemSchema } from "@/api/orders";

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
                    <TableRow key={`${lineItem.id}-${lineItem.product_id}-${lineItem.variation_id}`}>
                        <TableCell>
                            <span className="mr-2">{lineItem.name}</span>
                        </TableCell>
                        <TableCell>
                            <NumberInput 
                                value={lineItem.quantity} 
                                aria-label="Quantity of line item"
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}