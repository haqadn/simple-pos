'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
  Button,
} from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Tick02Icon,
  Loading03Icon,
  Alert02Icon,
  ArrowUpRight01Icon,
  ArrowTurnBackwardIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { listTodaysOrders, updateLocalOrderStatus, updateLocalOrder, updateLocalOrderSyncStatus } from '@/stores/offline-orders';
import { useSettingsStore } from '@/stores/settings';
import { syncOrder } from '@/services/sync';
import type { LocalOrder } from '@/db';
import BillPrint from '@/components/print/BillPrint';
import type { PrintJobData } from '@/stores/print';

interface TodaysOrdersModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * Today's Orders Modal
 *
 * Shows all orders created today with sync status and receipt preview.
 * Accessible by clicking on the OfflineIndicator component.
 */
export function TodaysOrdersModal({ isOpen, onOpenChange }: TodaysOrdersModalProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isReopening, setIsReopening] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const baseUrl = useSettingsStore((s) => s.api.baseUrl);

  // Query for today's orders
  const { data: rawOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['todaysOrders'],
    queryFn: listTodaysOrders,
    enabled: isOpen, // Only fetch when modal is open
    refetchInterval: isOpen ? 5000 : false, // Refresh every 5 seconds when open
  });

  // Sort orders: local-only first (by creation time), then synced (by server ID)
  const orders = useMemo(() => {
    return [...rawOrders].sort((a, b) => {
      // Local-only orders come first
      if (!a.serverId && b.serverId) return -1;
      if (a.serverId && !b.serverId) return 1;
      // Both local-only: sort by creation time (newest first)
      if (!a.serverId && !b.serverId) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      // Both synced: sort by server ID (highest = newest first)
      return b.serverId! - a.serverId!;
    });
  }, [rawOrders]);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedOrderId(null);
      refetch();
    }
  }, [isOpen, refetch]);

  // Find selected order
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find((order) => order.frontendId === selectedOrderId) || null;
  }, [selectedOrderId, orders]);

  // Format order status for display (cancelled takes priority over sync status)
  const getStatusConfig = useCallback((order: LocalOrder) => {
    // Check if order is cancelled first
    if (order.status === 'cancelled') {
      return {
        label: 'Cancelled',
        color: 'danger' as const,
        icon: Cancel01Icon,
      };
    }
    // Otherwise show sync status
    switch (order.syncStatus) {
      case 'synced':
        return {
          label: 'Synced',
          color: 'success' as const,
          icon: Tick02Icon,
        };
      case 'syncing':
        return {
          label: 'Syncing',
          color: 'warning' as const,
          icon: Loading03Icon,
        };
      case 'error':
        return {
          label: 'Error',
          color: 'danger' as const,
          icon: Alert02Icon,
        };
      case 'local':
      default:
        return {
          label: 'Pending',
          color: 'warning' as const,
          icon: ArrowUpRight01Icon,
        };
    }
  }, []);

  // Convert order to PrintJobData for BillPrint
  const getPrintJobData = useCallback((order: LocalOrder): PrintJobData => {
    const paymentMeta = order.data.meta_data?.find(
      (m) => m.key === 'payment_received'
    );
    const paymentReceived = paymentMeta
      ? parseFloat(String(paymentMeta.value))
      : 0;

    // Get service/table info from shipping lines
    const shippingLine = order.data.shipping_lines?.[0];
    const isDelivery = shippingLine?.method_id === 'flat_rate';

    // Calculate shipping total from all shipping lines
    const shippingTotal = order.data.shipping_lines?.reduce(
      (sum, line) => sum + parseFloat(String(line.total || '0')),
      0
    ) || 0;

    return {
      orderId: order.serverId,
      frontendId: order.frontendId,
      serverId: order.serverId,
      orderReference: order.frontendId,
      cartName: shippingLine?.method_title,
      serviceType: isDelivery ? 'delivery' : 'table',
      orderTime: order.data.date_created || order.createdAt.toISOString(),
      customerNote: order.data.customer_note,
      items: order.data.line_items.map((item) => ({
        id: item.id || item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(String(item.price || '0')),
      })),
      customer: {
        name: [order.data.billing?.first_name, order.data.billing?.last_name]
          .filter(Boolean)
          .join(' '),
        phone: order.data.billing?.phone,
        address: order.data.billing?.address_1,
      },
      payment: paymentReceived,
      discountTotal: parseFloat(order.data.discount_total || '0'),
      shippingTotal,
      total: parseFloat(order.data.total || '0'),
    };
  }, []);

  // Handle row selection
  const handleSelectionChange = useCallback((keys: 'all' | Set<React.Key>) => {
    if (keys === 'all') return;
    const selectedKey = Array.from(keys)[0];
    if (selectedKey) {
      setSelectedOrderId(String(selectedKey));
    } else {
      setSelectedOrderId(null);
    }
  }, []);

  // Handle reopen order
  const handleReopenOrder = useCallback(async () => {
    if (!selectedOrder) return;

    setIsReopening(true);
    try {
      // If order was completed, change status back to pending and clear payment data
      if (selectedOrder.status === 'completed') {
        // Clear payment metadata and update status
        const existingMetaData = selectedOrder.data.meta_data || [];
        const clearedMetaData = existingMetaData.filter(
          (m) => m.key !== 'payment_received' && m.key !== 'split_payments'
        );
        // Add reset payment values
        clearedMetaData.push({ key: 'payment_received', value: '0' });
        clearedMetaData.push({ key: 'split_payments', value: JSON.stringify({ cash: 0 }) });

        // Update order with cleared payments and pending status
        await updateLocalOrder(selectedOrder.frontendId, {
          meta_data: clearedMetaData,
        });
        await updateLocalOrderStatus(selectedOrder.frontendId, 'processing');

        // Reset syncStatus to 'local' so the order will sync again when completed
        // This ensures any changes made to the reopened order are pushed to the server
        await updateLocalOrderSyncStatus(selectedOrder.frontendId, 'local');

        // Queue sync to update server with reopened status
        syncOrder(selectedOrder.frontendId).catch(console.error);
        // Invalidate queries to refresh sidebar
        await queryClient.invalidateQueries({ queryKey: ['orders'] });
        await queryClient.invalidateQueries({ queryKey: ['localOrder', selectedOrder.frontendId] });
      }

      // Close modal and navigate to order
      onOpenChange(false);
      router.push(`/orders/${selectedOrder.frontendId}`);
    } catch (error) {
      console.error('Failed to reopen order:', error);
    } finally {
      setIsReopening(false);
    }
  }, [selectedOrder, onOpenChange, router, queryClient]);

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader>Today&apos;s Orders</ModalHeader>
            <ModalBody className="pb-6">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-default-500">
                  <p className="text-lg">No orders today</p>
                  <p className="text-sm">Orders will appear here as they are created</p>
                </div>
              ) : (
                <div className="flex gap-4 h-[500px]">
                  {/* Order List - Left Panel */}
                  <div className="flex-1 overflow-auto">
                    <Table
                      aria-label="Today's orders"
                      selectionMode="single"
                      selectedKeys={selectedOrderId ? new Set([selectedOrderId]) : new Set()}
                      onSelectionChange={handleSelectionChange}
                      shadow="none"
                      classNames={{
                        wrapper: 'min-h-[400px]',
                      }}
                    >
                      <TableHeader>
                        <TableColumn>Order ID</TableColumn>
                        <TableColumn>Server</TableColumn>
                        <TableColumn>Status</TableColumn>
                        <TableColumn align="end">Total</TableColumn>
                      </TableHeader>
                      <TableBody items={orders}>
                        {(order) => {
                          const statusConfig = getStatusConfig(order);
                          return (
                            <TableRow key={order.frontendId}>
                              <TableCell>
                                <span className="font-mono font-medium">
                                  {order.frontendId}
                                </span>
                              </TableCell>
                              <TableCell>
                                {order.serverId ? (
                                  <a
                                    href={`${baseUrl}/wp-admin/post.php?post=${order.serverId}&action=edit`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-default-500 hover:text-primary hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    #{order.serverId}
                                  </a>
                                ) : (
                                  <span className="text-default-400">--</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="sm"
                                  color={statusConfig.color}
                                  variant="flat"
                                  startContent={
                                    <HugeiconsIcon
                                      icon={statusConfig.icon}
                                      className="h-3 w-3"
                                    />
                                  }
                                >
                                  {statusConfig.label}
                                </Chip>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">
                                  {parseFloat(order.data.total || '0').toFixed(0)}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        }}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Receipt Preview - Right Panel */}
                  <div className="w-80 border-l border-default-200 pl-4 overflow-auto flex flex-col">
                    {selectedOrder ? (
                      <>
                        <div className="bg-white rounded-lg shadow-sm flex-1 overflow-auto">
                          <BillPrint data={getPrintJobData(selectedOrder)} isPreview />
                        </div>
                        <div className="pt-4 mt-auto">
                          <Button
                            color="primary"
                            variant="flat"
                            className="w-full"
                            onPress={handleReopenOrder}
                            isLoading={isReopening}
                            startContent={
                              !isReopening && (
                                <HugeiconsIcon
                                  icon={ArrowTurnBackwardIcon}
                                  className="h-4 w-4"
                                />
                              )
                            }
                          >
                            {selectedOrder.status === 'completed'
                              ? 'Reopen Order'
                              : 'Go to Order'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-default-400">
                        <p className="text-sm">Select an order to preview</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
