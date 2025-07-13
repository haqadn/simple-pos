'use client'

import { NumberInput, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { useCurrentOrder, usePaymentQuery } from "@/stores/orders";
import { useState, useEffect } from "react";

export default function PaymentCard() {
    const { query: orderQuery } = useCurrentOrder();
    const [paymentQuery, paymentMutation, paymentIsMutating] = usePaymentQuery(orderQuery);
    const [localReceived, setLocalReceived] = useState(0);

    const received = paymentQuery.data || 0;

    // Update local received value when payment query data changes
    useEffect(() => {
        setLocalReceived(received);
    }, [received]);

    const handleReceivedChange = (value: number) => {
        setLocalReceived(value);
        paymentMutation.mutate({ received: value });
    };

    const total = parseFloat(orderQuery.data?.total || '0');
    const change = localReceived - total;

    return (
        <Table 
            className="mb-4"
            aria-label="Payment details"
        >
            <TableHeader>
                <TableColumn>Description</TableColumn>
                <TableColumn>Amount</TableColumn>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell>{total}</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Received</TableCell>
                    <TableCell>
                        <NumberInput
                            value={localReceived}
                            onKeyUp={(e) => handleReceivedChange(Number(e.currentTarget.value))}
                            aria-label="Amount received"
                            color={paymentIsMutating ? 'warning' : 'default'}
                        />
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Change</TableCell>
                    <TableCell>{change.toFixed(2)}</TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}