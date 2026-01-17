'use client';

import { useEffect, useCallback } from 'react';
import { usePrintStore, PrintJobData } from '@/stores/print';
import { renderBill, renderKot } from '@/lib/escpos';
import type { PrinterConnection, BillData, KotData } from '@/lib/escpos';

export default function ThermalPrint() {
  const { currentJob, config, pop, setProcessing, isProcessing } = usePrintStore();

  // Send data to printer based on connection type
  const sendToPrinter = useCallback(async (
    connection: PrinterConnection,
    data: Uint8Array
  ): Promise<boolean> => {
    if (!config.enablePrinting) {
      console.log('[Print] Printing disabled, data size:', data.length, 'bytes');
      return true;
    }

    if (!window.electron) {
      console.error('[Print] Electron not available');
      return false;
    }

    try {
      let result: { success: boolean; error?: string };

      if (connection.type === 'usb' && connection.usbName) {
        result = await window.electron.escposPrintUsb(connection.usbName, data);
      } else if (connection.type === 'network' && connection.networkHost) {
        result = await window.electron.escposPrintNetwork(
          connection.networkHost,
          connection.networkPort || 9100,
          data
        );
      } else {
        console.error('[Print] Invalid printer connection:', connection);
        return false;
      }

      if (!result.success) {
        console.error('[Print] Print failed:', result.error);
      }
      return result.success;
    } catch (error) {
      console.error('[Print] Print error:', error);
      return false;
    }
  }, [config.enablePrinting]);

  // Handle bill print
  const handleBillPrint = useCallback(async (data: PrintJobData): Promise<void> => {
    const billData: BillData = {
      orderId: data.orderId,
      orderReference: data.orderReference,
      cartName: data.cartName,
      serviceType: data.serviceType,
      orderTime: data.orderTime,
      customer: data.customer,
      items: data.items,
      discountTotal: data.discountTotal,
      shippingTotal: data.shippingTotal,
      payment: data.payment,
      total: data.total,
    };

    const escposData = await renderBill(billData, {
      customization: config.bill,
      paperWidth: config.billPrinter.paperWidth || 80,
    });

    await sendToPrinter(config.billPrinter, escposData);
  }, [config.bill, config.billPrinter, sendToPrinter]);

  // Handle KOT print
  const handleKotPrint = useCallback(async (data: PrintJobData): Promise<void> => {
    const kotData: KotData = {
      orderId: data.orderId,
      orderReference: data.orderReference,
      cartName: data.cartName,
      serviceType: data.serviceType,
      customerNote: data.customerNote,
      kotItems: data.kotItems,
    };

    const escposData = renderKot(kotData, {
      settings: config.kot,
      paperWidth: config.kotPrinter.paperWidth || 80,
    });

    await sendToPrinter(config.kotPrinter, escposData);
  }, [config.kot, config.kotPrinter, sendToPrinter]);

  // Handle drawer kick
  const handleDrawer = useCallback(async (): Promise<void> => {
    if (!config.enableDrawer) {
      console.log('[Print] Cash drawer disabled');
      return;
    }

    if (!window.electron) {
      console.log('[Print] Cash drawer kick (no Electron)');
      return;
    }

    try {
      const result = await window.electron.openDrawerEscpos(
        config.billPrinter,
        config.drawerPulsePin
      );

      if (!result.success) {
        console.error('[Print] Drawer kick failed:', result.error);
      }
    } catch (error) {
      console.error('[Print] Drawer error:', error);
    }
  }, [config.enableDrawer, config.billPrinter, config.drawerPulsePin]);

  // Execute print job
  const executePrint = useCallback(async () => {
    if (!currentJob || isProcessing) return;

    setProcessing(true);

    const { type, data } = currentJob;

    try {
      switch (type) {
        case 'drawer':
          await handleDrawer();
          break;
        case 'bill':
          if (data) await handleBillPrint(data);
          break;
        case 'kot':
          if (data) await handleKotPrint(data);
          break;
      }
    } catch (error) {
      console.error(`[Print] Error processing ${type}:`, error);
    }

    pop();
  }, [currentJob, isProcessing, setProcessing, pop, handleDrawer, handleBillPrint, handleKotPrint]);

  // Watch for new jobs
  useEffect(() => {
    if (currentJob && !isProcessing) {
      executePrint();
    }
  }, [currentJob, isProcessing, executePrint]);

  // ESC/POS printing doesn't need visual rendering
  return null;
}
