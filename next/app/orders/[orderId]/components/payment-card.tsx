'use client'

import { Input, Button, Chip } from "@heroui/react";
import { useCurrentOrder, usePaymentQuery } from "@/stores/orders";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import OrdersAPI from "@/api/orders";

export default function PaymentCard() {
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const [paymentQuery, paymentMutation, paymentIsMutating] = usePaymentQuery(orderQuery);
    const [localReceived, setLocalReceived] = useState(0);
    const [isRemovingCoupon, setIsRemovingCoupon] = useState(false);

    const received = paymentQuery.data || 0;

    // Update local received value when payment query data changes
    useEffect(() => {
        setLocalReceived(received);
    }, [received]);

    const handleReceivedChange = (value: number) => {
        setLocalReceived(value);
        paymentMutation.mutate({ received: value });
    };

    // Remove coupon handler
    const handleRemoveCoupon = useCallback(async () => {
        if (!orderQuery.data) return;

        setIsRemovingCoupon(true);
        try {
            const orderId = orderQuery.data.id;
            const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
                coupon_lines: []
            });
            queryClient.setQueryData(['orders', orderId, 'detail'], updatedOrder);
        } catch (error) {
            console.error('Failed to remove coupon:', error);
        } finally {
            setIsRemovingCoupon(false);
        }
    }, [orderQuery.data, queryClient]);

    const total = parseFloat(orderQuery.data?.total || '0');
    const discountTotal = parseFloat(orderQuery.data?.discount_total || '0');
    const couponLines = orderQuery.data?.coupon_lines || [];
    const change = localReceived - total;
    const isPaid = localReceived >= total && total > 0;

    // Quick payment amounts (BDT denominations: 100, 200, 500, 1000)
    const quickPayments = useMemo(() => {
        const amounts: { label: string; value: number }[] = [];

        if (total > 0) {
            amounts.push({ label: 'Exact', value: total });

            const roundTo100 = Math.ceil(total / 100) * 100;
            const roundTo200 = Math.ceil(total / 200) * 200;
            const roundTo500 = Math.ceil(total / 500) * 500;
            const roundTo1000 = Math.ceil(total / 1000) * 1000;

            if (roundTo100 > total && !amounts.some(a => a.value === roundTo100)) {
                amounts.push({ label: `${roundTo100}`, value: roundTo100 });
            }
            if (roundTo200 > total && !amounts.some(a => a.value === roundTo200)) {
                amounts.push({ label: `${roundTo200}`, value: roundTo200 });
            }
            if (roundTo500 > total && !amounts.some(a => a.value === roundTo500)) {
                amounts.push({ label: `${roundTo500}`, value: roundTo500 });
            }
            if (roundTo1000 > total && !amounts.some(a => a.value === roundTo1000)) {
                amounts.push({ label: `${roundTo1000}`, value: roundTo1000 });
            }
        }

        return amounts.slice(0, 5);
    }, [total]);

    return (
        <div className="mb-4">
            <table className="w-full" aria-label="Payment details">
                <tbody>
                    {/* Applied coupons */}
                    {couponLines.map((coupon, index) => (
                        <tr key={coupon.id || index}>
                            <td className="pr-4 text-sm w-3/5">
                                <Chip
                                    size="sm"
                                    color="success"
                                    variant="flat"
                                    onClose={handleRemoveCoupon}
                                    isDisabled={isRemovingCoupon}
                                >
                                    {coupon.code.toUpperCase()}
                                </Chip>
                            </td>
                            <td className="text-sm text-green-600 text-right">
                                -{parseFloat(coupon.discount).toFixed(2)}
                            </td>
                        </tr>
                    ))}

                    {/* Discount row (if no coupon lines but has discount) */}
                    {discountTotal > 0 && couponLines.length === 0 && (
                        <tr>
                            <td className="pr-4 text-sm w-3/5">Discount</td>
                            <td className="text-sm text-green-600 text-right">
                                -{discountTotal.toFixed(2)}
                            </td>
                        </tr>
                    )}

                    <tr>
                        <td className="pr-4 text-sm w-3/5">Total</td>
                        <td className="text-sm">
                            <Input
                                variant="underlined"
                                value={total.toFixed(2)}
                                isDisabled
                                classNames={{ input: 'text-right' }}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="pr-4 text-sm w-3/5">Received</td>
                        <td>
                            <Input
                                variant="underlined"
                                type="number"
                                step={1}
                                min={0}
                                value={localReceived === 0 ? '' : localReceived.toString()}
                                onValueChange={(v) => {
                                    const num = Number(v);
                                    if (!isNaN(num) && num >= 0) {
                                        handleReceivedChange(num);
                                    }
                                }}
                                aria-label="Amount received"
                                color={paymentIsMutating ? 'warning' : 'default'}
                                classNames={{ input: 'text-right' }}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td className="pr-4 text-sm w-3/5">
                            {change >= 0 ? 'Change' : 'Short'}
                        </td>
                        <td className="text-sm">
                            <Input
                                variant="underlined"
                                value={Math.abs(change).toFixed(2)}
                                isDisabled
                                classNames={{
                                    input: `text-right ${change >= 0 ? 'text-green-600' : 'text-red-600'}`
                                }}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Quick payment buttons */}
            {quickPayments.length > 0 && !isPaid && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {quickPayments.map((qp) => (
                        <Button
                            key={qp.value}
                            size="sm"
                            variant="flat"
                            onPress={() => handleReceivedChange(qp.value)}
                        >
                            {qp.label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
