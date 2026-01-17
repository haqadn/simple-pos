'use client'

import { Input, Button, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import { useCurrentOrder, usePaymentQuery } from "@/stores/orders";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import OrdersAPI from "@/api/orders";
import { formatCurrency } from "@/lib/format";
import { useSettingsStore } from "@/stores/settings";

// PaymentAmounts is now dynamic: cash is always present, other keys come from settings
type PaymentAmounts = { cash: number } & Record<string, number>;

export default function PaymentCard() {
    const orderQuery = useCurrentOrder();
    const orderData = orderQuery.data;
    const queryClient = useQueryClient();
    const [paymentQuery, , paymentIsMutating] = usePaymentQuery(orderQuery);
    const [isRemovingCoupon, setIsRemovingCoupon] = useState(false);

    // Get configurable payment methods from settings
    const paymentMethods = useSettingsStore(state => state.paymentMethods);

    // Local state for split payments
    const [payments, setPayments] = useState<PaymentAmounts>({ cash: 0 });
    const [activeAdditionalMethods, setActiveAdditionalMethods] = useState<Set<string>>(new Set());

    // Parse stored payment data from meta_data
    const storedPayments = useMemo((): PaymentAmounts => {
        const paymentMeta = orderData?.meta_data?.find(m => m.key === 'split_payments');
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
    }, [orderData?.meta_data, paymentQuery.data]);

    // Sync local state with stored data
    useEffect(() => {
        setPayments(storedPayments);
        // Set active methods based on stored payments (dynamically check all non-cash keys)
        const activeMethods = new Set<string>();
        for (const key of Object.keys(storedPayments)) {
            if (key !== 'cash' && storedPayments[key] > 0) {
                activeMethods.add(key);
            }
        }
        setActiveAdditionalMethods(activeMethods);
    }, [storedPayments]);

    // Calculate total received (sum all payment amounts dynamically)
    const totalReceived = useMemo(() => {
        return Object.values(payments).reduce((sum, amount) => sum + (amount || 0), 0);
    }, [payments]);

    // Save payments to meta_data
    const savePayments = useCallback(async (newPayments: PaymentAmounts) => {
        if (!orderData) return;

        const orderId = orderData.id;
        const orderQueryKey = ['orders', orderId, 'detail'];
        const currentOrder = queryClient.getQueryData<typeof orderData>(orderQueryKey) || orderData;

        // Calculate total for legacy compatibility (sum all payment amounts dynamically)
        const total = Object.values(newPayments).reduce((sum, amount) => sum + (amount || 0), 0);

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
    }, [orderData, queryClient]);

    // Handle payment amount change
    const handlePaymentChange = useCallback((method: string, value: number) => {
        const newPayments = { ...payments, [method]: value };
        setPayments(newPayments);
        savePayments(newPayments);
    }, [payments, savePayments]);

    // Add a payment method
    const handleAddMethod = useCallback((method: string) => {
        setActiveAdditionalMethods(prev => new Set([...prev, method]));
    }, []);

    // Remove a payment method
    const handleRemoveMethod = useCallback((method: string) => {
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
        if (!orderData) return;

        setIsRemovingCoupon(true);
        try {
            const orderId = orderData.id;
            const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
                coupon_lines: []
            });
            queryClient.setQueryData(['orders', orderId, 'detail'], updatedOrder);
        } catch (error) {
            console.error('Failed to remove coupon:', error);
        } finally {
            setIsRemovingCoupon(false);
        }
    }, [orderData, queryClient]);

    const total = parseFloat(orderData?.total || '0');
    const discountTotal = parseFloat(orderData?.discount_total || '0');
    const couponLines = orderData?.coupon_lines || [];
    const change = totalReceived - total;
    const isPaid = totalReceived >= total && total > 0;

    // Available methods to add (ones not already active)
    const availableMethods = paymentMethods.filter(
        m => !activeAdditionalMethods.has(m.key)
    );

    // Quick payment amounts (BDT denominations) - based on total, not remaining
    const quickPayments = useMemo(() => {
        if (total <= 0 || isPaid) return [];

        const amounts: { label: string; value: number }[] = [];

        // "Exact" pays the full total
        amounts.push({ label: 'Exact', value: total });

        // Round up to common denominations
        const roundTo100 = Math.ceil(total / 100) * 100;
        const roundTo500 = Math.ceil(total / 500) * 500;
        const roundTo1000 = Math.ceil(total / 1000) * 1000;

        if (roundTo100 > total && !amounts.some(a => a.value === roundTo100)) {
            amounts.push({ label: `${roundTo100}`, value: roundTo100 });
        }
        if (roundTo500 > total && !amounts.some(a => a.value === roundTo500)) {
            amounts.push({ label: `${roundTo500}`, value: roundTo500 });
        }
        if (roundTo1000 > total && !amounts.some(a => a.value === roundTo1000)) {
            amounts.push({ label: `${roundTo1000}`, value: roundTo1000 });
        }

        return amounts.slice(0, 4);
    }, [total, isPaid]);

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
                                -{formatCurrency(parseFloat(coupon.discount))}
                            </td>
                        </tr>
                    ))}

                    {/* Discount row (if no coupon lines but has discount) */}
                    {discountTotal > 0 && couponLines.length === 0 && (
                        <tr>
                            <td className="pr-4 text-sm w-3/5">Discount</td>
                            <td className="text-sm text-green-600 text-right">
                                -{formatCurrency(discountTotal)}
                            </td>
                        </tr>
                    )}

                    <tr>
                        <td className="pr-4 text-sm w-3/5">Total</td>
                        <td className="text-sm">
                            <Input
                                variant="underlined"
                                value={formatCurrency(total)}
                                isDisabled
                                classNames={{ input: 'text-right' }}
                            />
                        </td>
                    </tr>

                    {/* Cash payment - always visible */}
                    <tr>
                        <td className="pr-4 text-sm w-3/5">
                            <span className="flex items-center gap-2">
                                Cash
                                {/* Add payment method dropdown - inline with Cash */}
                                {availableMethods.length > 0 && total > 0 && (
                                    <Dropdown>
                                        <DropdownTrigger>
                                            <button className="text-xs text-gray-400 hover:text-primary">
                                                +
                                            </button>
                                        </DropdownTrigger>
                                        <DropdownMenu
                                            aria-label="Add payment method"
                                            onAction={(key) => handleAddMethod(key as string)}
                                        >
                                            {availableMethods.map(method => (
                                                <DropdownItem key={method.key}>
                                                    {method.label}
                                                </DropdownItem>
                                            ))}
                                        </DropdownMenu>
                                    </Dropdown>
                                )}
                            </span>
                        </td>
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

                    {/* Additional payment methods (from settings + any legacy methods with values) */}
                    {Array.from(activeAdditionalMethods).map(methodKey => {
                        // Find the method in settings, or create a fallback for legacy methods
                        const method = paymentMethods.find(m => m.key === methodKey) || { key: methodKey, label: methodKey };
                        return (
                            <tr key={methodKey}>
                                <td className="pr-4 text-sm w-3/5">
                                    <span className="flex items-center gap-1">
                                        {method.label}
                                        <button
                                            onClick={() => handleRemoveMethod(methodKey)}
                                            className="text-gray-400 hover:text-red-500 text-xs"
                                            aria-label={`Remove ${method.label}`}
                                        >
                                            x
                                        </button>
                                    </span>
                                </td>
                                <td>
                                    <Input
                                        variant="underlined"
                                        type="number"
                                        step={1}
                                        min={0}
                                        value={payments[methodKey] === 0 ? '' : (payments[methodKey] || '').toString()}
                                        onValueChange={(v) => {
                                            const num = Number(v);
                                            if (!isNaN(num) && num >= 0) {
                                                handlePaymentChange(methodKey, num);
                                            }
                                        }}
                                        aria-label={`${method.label} amount`}
                                        classNames={{ input: 'text-right' }}
                                    />
                                </td>
                            </tr>
                        );
                    })}

                    {/* Total received - only when using multiple payment methods */}
                    {activeAdditionalMethods.size > 0 && (
                        <tr>
                            <td className="pr-4 text-sm w-3/5 pt-1 font-medium">Received</td>
                            <td className="text-sm pt-1">
                                <Input
                                    variant="underlined"
                                    value={formatCurrency(totalReceived)}
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
                                value={formatCurrency(Math.abs(change))}
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
                            onPress={() => handlePaymentChange('cash', qp.value)}
                        >
                            {qp.label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
