'use client'

import { Card, CardBody, Input, Button, Spinner } from "@heroui/react";
import { useCurrentOrder } from "@/stores/orders";
import { useCouponValidation, CouponValidationStatus } from "@/stores/coupons";
import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import OrdersAPI from "@/api/orders";
import { CouponLineSchema } from "@/api/orders";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Cancel01Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { isValidFrontendId } from "@/lib/frontend-id";
import { updateLocalOrder } from "@/stores/offline-orders";
import { syncOrder } from "@/services/sync";
import type { LocalOrder } from "@/db";

// Status indicator component
function StatusIndicator({ status }: { status: CouponValidationStatus }) {
    switch (status) {
        case 'validating':
            return <Spinner size="sm" color="warning" />;
        case 'valid':
            return <HugeiconsIcon icon={CheckmarkCircle02Icon} className="text-green-500 h-5 w-5" />;
        case 'invalid':
            return <HugeiconsIcon icon={Cancel01Icon} className="text-red-500 h-5 w-5" />;
        case 'error':
            return <HugeiconsIcon icon={Alert02Icon} className="text-orange-500 h-5 w-5" />;
        default:
            return null;
    }
}

// Status color mapping
function getStatusColor(status: CouponValidationStatus): "default" | "success" | "danger" | "warning" {
    switch (status) {
        case 'validating':
            return 'warning';
        case 'valid':
            return 'success';
        case 'invalid':
        case 'error':
            return 'danger';
        default:
            return 'default';
    }
}

export default function CouponCard() {
    const params = useParams();
    const urlOrderId = params?.orderId as string | undefined;
    const orderQuery = useCurrentOrder();
    const orderData = orderQuery.data;
    const queryClient = useQueryClient();
    const [isApplying, setIsApplying] = useState(false);

    // Check if this is a frontend ID (local-first) order
    const isFrontendIdOrder = urlOrderId ? isValidFrontendId(urlOrderId) : false;

    const {
        code,
        setCode,
        status,
        summary,
        error,
        isLoading,
        clear,
        coupon,
    } = useCouponValidation(500);

    // Check if a coupon is already applied to the order
    const appliedCoupons = useMemo(
        () => orderData?.coupon_lines || [],
        [orderData?.coupon_lines]
    );
    const hasAppliedCoupon = appliedCoupons.length > 0;

    // Apply coupon to the order
    const handleApplyCoupon = useCallback(async () => {
        if (!orderData || status !== 'valid' || !code.trim() || !coupon) return;

        setIsApplying(true);
        try {
            const couponCode = code.trim().toLowerCase();

            // Calculate the discount amount based on the coupon type
            let discountAmount = 0;
            const subtotal = parseFloat(orderData.subtotal || orderData.total || '0');

            if (coupon.discount_type === 'percent') {
                discountAmount = (subtotal * parseFloat(coupon.amount)) / 100;
            } else {
                // fixed_cart or fixed_product
                discountAmount = parseFloat(coupon.amount);
            }

            // Build new coupon line with calculated discount
            const newCouponLine: CouponLineSchema = {
                code: couponCode,
                discount: discountAmount.toFixed(2),
                discount_tax: '0.00',
            };

            // Merge with existing coupons
            const existingCoupons = appliedCoupons.filter(c => c.code !== couponCode);
            const updatedCouponLines = [...existingCoupons, newCouponLine];

            // Calculate total discount
            const totalDiscount = updatedCouponLines.reduce((sum, c) => {
                return sum + parseFloat(c.discount || '0');
            }, 0);

            // Handle frontend ID orders - save to Dexie only (local-first)
            if (isFrontendIdOrder && urlOrderId) {
                // Save to Dexie
                const updatedLocalOrder = await updateLocalOrder(urlOrderId, {
                    coupon_lines: updatedCouponLines,
                    discount_total: totalDiscount.toFixed(2),
                });

                // Update the local order query cache optimistically
                queryClient.setQueryData<LocalOrder>(['localOrder', urlOrderId], updatedLocalOrder);

                // Queue sync operation (async - don't await)
                syncOrder(urlOrderId).catch(err => {
                    console.error('Failed to queue sync for order:', urlOrderId, err);
                });

                // Clear the input after successful application
                clear();
                return;
            }

            // For server orders, use the API
            const orderId = orderData.id;
            const orderQueryKey = ['orders', orderId, 'detail'];

            // Add coupon to the order via API
            // WooCommerce accepts coupon_lines with just the code field for new coupons
            const existingCodes = appliedCoupons.map(c => ({ code: c.code }));
            const updatedOrder = await OrdersAPI.updateOrder(orderId.toString(), {
                coupon_lines: [
                    ...existingCodes,
                    { code: couponCode }
                ] as CouponLineSchema[]
            });

            // Update cache with the response
            queryClient.setQueryData(orderQueryKey, updatedOrder);

            // Clear the input after successful application
            clear();
        } catch (err) {
            console.error('Failed to apply coupon:', err);
            // Could add toast notification here
        } finally {
            setIsApplying(false);
        }
    }, [orderData, status, code, coupon, appliedCoupons, queryClient, clear, isFrontendIdOrder, urlOrderId]);

    // Handle Enter key press
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && status === 'valid' && !isApplying) {
            handleApplyCoupon();
        }
    }, [status, isApplying, handleApplyCoupon]);

    if (orderQuery.isLoading) {
        return (
            <Card className="mb-4 border border-default-200 bg-white" shadow="none">
                <CardBody>
                    <Input
                        label="Coupon Code"
                        variant="underlined"
                        isDisabled
                    />
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="mb-4 border border-default-200 bg-white" shadow="none">
            <CardBody>
                <div className="flex items-start gap-2">
                    <Input
                        className="flex-1"
                        label="Coupon Code"
                        variant="underlined"
                        value={code}
                        onValueChange={setCode}
                        onKeyDown={handleKeyDown}
                        color={getStatusColor(status)}
                        isDisabled={isApplying}
                        endContent={<StatusIndicator status={status} />}
                        description={
                            status === 'valid' ? (
                                <span className="text-green-600">{summary}</span>
                            ) : status === 'invalid' || status === 'error' ? (
                                <span className="text-red-500">{error}</span>
                            ) : null
                        }
                    />
                    <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="mt-4"
                        isDisabled={status !== 'valid' || isApplying || isLoading}
                        isLoading={isApplying}
                        onPress={handleApplyCoupon}
                    >
                        Apply
                    </Button>
                </div>

                {/* Show currently applied coupons info */}
                {hasAppliedCoupon && (
                    <p className="text-xs text-gray-500 mt-2">
                        {appliedCoupons.length} coupon{appliedCoupons.length > 1 ? 's' : ''} applied.
                        See details in payment section.
                    </p>
                )}
            </CardBody>
        </Card>
    );
}
