'use client'

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";

export default function Service() {
    return (
        <Table>
            <TableHeader>
                <TableColumn>Service</TableColumn>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>Service</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}