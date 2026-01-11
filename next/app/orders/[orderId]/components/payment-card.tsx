'use client'

import { Input, Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { useCurrentOrder, usePaymentQuery } from "@/stores/orders";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import OrdersAPI from "@/api/orders";

// Payment methods that can be added
const ADDITIONAL_METHODS = [
    { key: 'bkash', label: 'bKash' },
    { key: 'nagad', label: 'Nagad' },
    { key: 'card', label: 'Card' },
] as const;

type PaymentMethodKey = 'cash' | typeof ADDITIONAL_METHODS[number]['key'];

interface PaymentAmounts {
    cash: number;
    bkash?: number;
    nagad?: number;
    card?: number;
}

export default function PaymentCard() {
    const orderQuery = useCurrentOrder();
    const queryClient = useQueryClient();
    const [paymentQuery, paymentMutation, paymentIsMutating] = usePaymentQuery(orderQuery);
    const [isRemovingCoupon, setIsRemovingCoupon] = useState(false);

    // Local state for split payments
    const [payments, setPayments] = useState<PaymentAmounts>({ cash: 0 });
    const [activeAdditionalMethods, setActiveAdditionalMethods] = useState<Set<PaymentMethodKey>>(new Set());

    // Parse stored payment data from meta_data
    const storedPayments = useMemo((): PaymentAmounts => {
        const paymentMeta = orderQuery.data?.meta_data?.find(m => m.key === 'split_payments');
        if (paymentMeta && typeof paymentMeta.value === 'string') {
            try {
                return JSON.parse(paymentMeta.value);
            } catch {
                // Fall back to old format
            }
        }
        // Fall back to legacy payment_received
        const received = paymentQuery.data || 0;
        return { cash: received };
    }, [orderQuery.data?.meta_data, paymentQuery.data]);

    // Sync local state with stored data
    useEffect(() => {
        setPayments(storedPayments);
        // Set active methods based on stored payments
        const activeMethods = new Set<PaymentMethodKey>();
        if (storedPayments.bkash && storedPayments.bkash > 0) activeMethods.add('bkash');
        if (storedPayments.nagad && storedPayments.nagad > 0) activeMethods.add('nagad');
        if (storedPayments.card && storedPayments.card > 0) activeMethods.add('card');
        setActiveAdditionalMethods(activeMethods);
    }, [storedPayments]);

    // Calculate total received
    const totalReceived = useMemo(() => {
        return (payments.cash || 0) +
               (payments.bkash || 0) +
               (payments.nagad || 0) +
               (payments.card || 0);
    }, [payments]);

    // Save payments to meta_data
    const savePayments = useCallback(async (newPayments: PaymentAmounts) => {
        if (!orderQuery.data) return;

        const orderId = orderQuery.data.id;
        const orderQueryKey = ['orders', orderId, 'detail'];
        const currentOrder = queryClient.getQueryData<typeof orderQuery.data>(orderQueryKey) || orderQuery.data;

        // Calculate total for legacy compatibility
        const total = (newPayments.cash || 0) +
                      (newPayments.bkash || 0) +
                      (newPayments.nagad || 0) +
                      (newPayments.card || 0);

        // Update meta_data
        const metaData = currentOrder.meta_data.filter(
            m => m.key !== 'split_payments' && m.key !== 'payment_received'
        );
        metaData.push({ key: 'split_payments', value: JSON.stringify(newPayments) });
        metaData.push({ key: 'payment_received', value: total.toString() });

        // Optimistic update
        queryClient.setQueryData(orderQueryKey, { ...currentOrder, meta_data: metaData });

        // API call
        try {
            await OrdersAPI.updateOrder(orderId.toString(), { meta_data: metaData });
        } catch (error) {
            console.error('Failed to save payments:', error);
            queryClient.invalidateQueries({ queryKey: orderQueryKey });
        }
    }, [orderQuery.data, queryClient]);

    // Handle payment amount change
    const handlePaymentChange = useCallback((method: PaymentMethodKey, value: number) => {
        const newPayments = { ...payments, [method]: value };
        setPayments(newPayments);
        savePayments(newPayments);
    }, [payments, savePayments]);

    // Add a payment method
    const handleAddMethod = useCallback((method: PaymentMethodKey) => {
        setActiveAdditionalMethods(prev => new Set([...prev, method]));
    }, []);

    // Remove a payment method
    const handleRemoveMethod = useCallback((method: PaymentMethodKey) => {
        setActiveAdditionalMethods(prev => {
            const next = new Set(prev);
            next.delete(method);
            return next;
        });
        // Clear the amount for this method
        const newPayments = { ...payments, [method]: 0 };
        setPayments(newPayments);
        savePayments(newPayments);
    }, [payments, savePayments]);

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
    const change = totalReceived - total;
    const isPaid = totalReceived >= total && total > 0;

    // Available methods to add (ones not already active)
    const availableMethods = ADDITIONAL_METHODS.filter(
        m => !activeAdditionalMethods.has(m.key)
    );

    // Quick payment amounts (BDT denominations)
    const quickPayments = useMemo(() => {
        const remaining = total - totalReceived;
        if (remaining <= 0) return [];

        const amounts: { label: string; value: number }[] = [];
        amounts.push({ label: 'Exact', value: remaining });

        const roundTo100 = Math.ceil(remaining / 100) * 100;
        const roundTo500 = Math.ceil(remaining / 500) * 500;
        const roundTo1000 = Math.ceil(remaining / 1000) * 1000;

        if (roundTo100 > remaining) amounts.push({ label: `${roundTo100}`, value: roundTo100 });
        if (roundTo500 > remaining && roundTo500 !== roundTo100) amounts.push({ label: `${roundTo500}`, value: roundTo500 });
        if (roundTo1000 > remaining && roundTo1000 !== roundTo500) amounts.push({ label: `${roundTo1000}`, value: roundTo1000 });

        return amounts.slice(0, 4);
    }, [total, totalReceived]);

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

                    {/* Cash payment - always visible */}
                    <tr>
                        <td className="pr-4 text-sm w-3/5">Cash</td>
                        <td>
                            <Input
                                variant="underlined"
                                type="number"
                                step={1}
                                min={0}
                                value={payments.cash === 0 ? '' : payments.cash.toString()}
                                onValueChange={(v) => {
                                    const num = Number(v);
                                    if (!isNaN(num) && num >= 0) {
                                        handlePaymentChange('cash', num);
                                    }
                                }}
                                aria-label="Cash amount"
                                color={paymentIsMutating ? 'warning' : 'default'}
                                classNames={{ input: 'text-right' }}
                            />
                        </td>
                    </tr>

                    {/* Additional payment methods */}
                    {ADDITIONAL_METHODS.map(method =>
                        activeAdditionalMethods.has(method.key) && (
                            <tr key={method.key}>
                                <td className="pr-4 text-sm w-3/5">
                                    <span className="flex items-center gap-1">
                                        {method.label}
                                        <button
                                            onClick={() => handleRemoveMethod(method.key)}
                                            className="text-gray-400 hover:text-red-500 text-xs"
                                            aria-label={`Remove ${method.label}`}
                                        >
                                            ✕
                                        </button>
                                    </span>
                                </td>
                                <td>
                                    <Input
                                        variant="underlined"
                                        type="number"
                                        step={1}
                                        min={0}
                                        value={payments[method.key] === 0 ? '' : (payments[method.key] || '').toString()}
                                        onValueChange={(v) => {
                                            const num = Number(v);
                                            if (!isNaN(num) && num >= 0) {
                                                handlePaymentChange(method.key, num);
                                            }
                                        }}
                                        aria-label={`${method.label} amount`}
                                        classNames={{ input: 'text-right' }}
                                    />
                                </td>
                            </tr>
                        )
                    )}

                    {/* Add payment method dropdown */}
                    {availableMethods.length > 0 && (
                        <tr>
                            <td colSpan={2} className="pt-1">
                                <Dropdown>
                                    <DropdownTrigger>
                                        <Button size="sm" variant="light" className="text-xs">
                                            + Add payment method
                                        </Button>
                                    </DropdownTrigger>
                                    <DropdownMenu
                                        aria-label="Add payment method"
                                        onAction={(key) => handleAddMethod(key as PaymentMethodKey)}
                                    >
                                        {availableMethods.map(method => (
                                            <DropdownItem key={method.key}>
                                                {method.label}
                                            </DropdownItem>
                                        ))}
                                    </DropdownMenu>
                                </Dropdown>
                            </td>
                        </tr>
                    )}

                    {/* Separator when there are multiple payment methods */}
                    {activeAdditionalMethods.size > 0 && (
                        <tr>
                            <td className="pr-4 text-sm w-3/5 pt-2 font-medium">Received</td>
                            <td className="text-sm pt-2">
                                <Input
                                    variant="underlined"
                                    value={totalReceived.toFixed(2)}
                                    isDisabled
                                    classNames={{ input: 'text-right font-medium' }}
                                />
                            </td>
                        </tr>
                    )}

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

            {/* Quick payment buttons - add to cash */}
            {quickPayments.length > 0 && !isPaid && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {quickPayments.map((qp) => (
                        <Button
                            key={qp.value}
                            size="sm"
                            variant="flat"
                            onPress={() => handlePaymentChange('cash', (payments.cash || 0) + qp.value)}
                        >
                            +{qp.label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
