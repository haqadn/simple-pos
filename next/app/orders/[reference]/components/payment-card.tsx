'use client'

import { Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";

export default function PaymentCard() {
    return (
        <Table>
            <TableHeader>
                <TableColumn>Description</TableColumn>
                <TableColumn>Amount</TableColumn>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell>500</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Paid</TableCell>
                    <TableCell>600</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Balance</TableCell>
                    <TableCell>100</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}