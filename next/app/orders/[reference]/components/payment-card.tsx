'use client'

import { NumberInput, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";

export default function PaymentCard() {
    return (
        <Table className="mb-4">
            <TableHeader>
                <TableColumn>Description</TableColumn>
                <TableColumn>Amount</TableColumn>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell>400</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Received</TableCell>
                    <TableCell><NumberInput value={500} /></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Change</TableCell>
                    <TableCell>100</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}