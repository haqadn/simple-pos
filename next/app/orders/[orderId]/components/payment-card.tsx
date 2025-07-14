'use client'

import { Input, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
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
        <table 
            className="mb-4"
            aria-label="Payment details"
        >
            <tbody>
                <tr>
                    <td className="pr-4 text-sm w-3/5">Total</td>
                    <td className="text-sm">
                        <Input
                            variant="underlined"
                            value={total.toString()}
                            isDisabled
                        />
                    </td>
                </tr>
                <tr>
                    <td className="pr-4 text-sm w-3/5">Received</td>
                    <td >
                        <Input
                            variant="underlined"
                            step={100}
                            value={localReceived === 0 ? '' : localReceived.toString()}
                            onValueChange={(v) => {
                                if (Number(v) >= 0) {
                                    handleReceivedChange(Number(v));
                                }
                            }}
                            aria-label="Amount received"
                            color={paymentIsMutating ? 'warning' : 'default'}
                        />
                    </td>
                </tr>
                <tr>
                    <td className="pr-4 text-sm w-3/5">Change</td>
                    <td className="text-sm">
                        <Input
                            variant="underlined"
                            value={change.toFixed(2)}
                            isDisabled
                        />
                    </td>
                </tr>
            </tbody>
        </table>
    );
}