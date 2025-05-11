'use client'

import { NumberInput, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";

export default function LineItems() {
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
                <TableRow>
                    <TableCell>
                        <span className="mr-2">Chicken Strips (4pcs)</span>
                        <span className="text-xs text-gray-500">200</span>
                    </TableCell>
                    <TableCell>
                        <NumberInput 
                            value={4} 
                            aria-label="Quantity of line item"
                        />
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>
                        <span className="mr-2">BBQ Chicken Wings (4pcs)</span>
                        <span className="text-xs text-gray-500">100</span>
                    </TableCell>
                    <TableCell>
                        <NumberInput 
                            value={5} 
                            aria-label="Quantity of line item"
                        />
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}