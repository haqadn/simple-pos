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
} from '@hugeicons/core-free-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { listTodaysOrders, updateLocalOrderStatus } from '@/stores/offline-orders';
import { syncOrder } from '@/services/sync';
import type { LocalOrder, SyncStatus } from '@/db';
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

  // Query for today's orders
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['todaysOrders'],
    queryFn: listTodaysOrders,
    enabled: isOpen, // Only fetch when modal is open
    refetchInterval: isOpen ? 5000 : false, // Refresh every 5 seconds when open
  });

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

  // Calculate summary stats
  const summary = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + parseFloat(order.data.total || '0');
    }, 0);
    return {
      count: orders.length,
      totalRevenue: totalRevenue.toFixed(2),
    };
  }, [orders]);

  // Format sync status for display
  const getSyncStatusConfig = useCallback((status: SyncStatus) => {
    switch (status) {
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
      // If order was completed, change status back to pending
      if (selectedOrder.status === 'completed') {
        await updateLocalOrderStatus(selectedOrder.frontendId, 'pending');
        // Queue sync to update server
        syncOrder(selectedOrder.frontendId).catch(console.error);
        // Invalidate queries to refresh sidebar
        await queryClient.invalidateQueries({ queryKey: ['localOrders'] });
        await queryClient.invalidateQueries({ queryKey: ['ordersWithFrontendIds'] });
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
            <ModalHeader className="flex flex-col gap-1">
              <span>Today&apos;s Orders</span>
              <span className="text-sm font-normal text-default-500">
                {summary.count} orders | {summary.totalRevenue} total
              </span>
            </ModalHeader>
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
                          const syncConfig = getSyncStatusConfig(order.syncStatus);
                          return (
                            <TableRow key={order.frontendId}>
                              <TableCell>
                                <span className="font-mono font-medium">
                                  {order.frontendId}
                                </span>
                              </TableCell>
                              <TableCell>
                                {order.serverId ? (
                                  <span className="text-default-500">
                                    #{order.serverId}
                                  </span>
                                ) : (
                                  <span className="text-default-400">--</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="sm"
                                  color={syncConfig.color}
                                  variant="flat"
                                  startContent={
                                    <HugeiconsIcon
                                      icon={syncConfig.icon}
                                      className="h-3 w-3"
                                    />
                                  }
                                >
                                  {syncConfig.label}
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
