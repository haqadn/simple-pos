'use client';

import { useEffect, useRef } from 'react';
import { usePrintStore, isElectron } from '@/stores/print';
import BillPrint from './BillPrint';
import KotPrint from './KotPrint';

export default function ThermalPrint() {
  const { queue, currentJob, config, pop, setProcessing, isProcessing } = usePrintStore();
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Get printer name based on job type
  const getPrinterName = (type: 'bill' | 'kot' | 'drawer'): string => {
    switch (type) {
      case 'drawer':
        return config.drawerPrinter;
      case 'kot':
        return config.kitchenPrinter;
      default:
        return config.billPrinter;
    }
  };

  // Execute print
  const executePrint = async () => {
    if (!currentJob || isProcessing) return;

    setProcessing(true);

    const { type, data } = currentJob;

    // Handle drawer separately
    if (type === 'drawer') {
      if (isElectron()) {
        window.electron!.openDrawer(getPrinterName('drawer'));
      } else {
        console.log('[Print] Cash drawer kick (dev mode)');
      }
      setTimeout(() => pop(), 500);
      return;
    }

    // For bill/kot, wait for render then print
    await new Promise(resolve => setTimeout(resolve, 100));

    if (isElectron() && config.enablePrinting) {
      // Electron printing
      window.electron!.print({
        deviceName: getPrinterName(type),
        silent: config.silentPrinting,
        pageSize: {
          width: config.printWidth * 1000,
          height: config.printHeight * 1000,
        },
      });

      // Wait for print to complete
      setTimeout(() => pop(), 1500);
    } else {
      // Browser/dev mode
      if (config.enablePrinting) {
        // Use browser print dialog
        window.onafterprint = () => {
          window.onafterprint = null;
          pop();
        };
        window.print();
      } else {
        // Dev mode - just log
        console.log('[Print]', {
          type,
          printer: getPrinterName(type),
          data,
        });
        pop();
      }
    }
  };

  // Watch for new jobs
  useEffect(() => {
    if (currentJob && !isProcessing) {
      executePrint();
    }
  }, [currentJob, isProcessing]);

  // Render nothing if no job or drawer type
  if (!currentJob || currentJob.type === 'drawer') {
    return null;
  }

  return (
    <div
      ref={printAreaRef}
      id="print-area"
      style={{ width: `${config.printWidth}mm` }}
      className="print-only"
    >
      {currentJob.type === 'bill' && currentJob.data && (
        <BillPrint data={currentJob.data} />
      )}
      {currentJob.type === 'kot' && currentJob.data && (
        <KotPrint data={currentJob.data} />
      )}

      <style jsx global>{`
        /* Hide print area on screen */
        #print-area {
          display: none;
        }

        /* Show only print area when printing */
        @media print {
          body * {
            visibility: hidden;
          }

          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>
    </div>
  );
}
