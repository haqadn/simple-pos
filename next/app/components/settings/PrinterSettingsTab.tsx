'use client';

import { useState } from 'react';
import {
  Textarea,
  Checkbox,
  Select,
  SelectItem,
  Button,
  Divider,
} from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoneyBag01Icon } from '@hugeicons/core-free-icons';
import { usePrintStore } from '@/stores/print';
import type { PrinterConnection, BillCustomization } from '@/lib/escpos';
import { PrinterConnectionForm } from './PrinterConnectionForm';
import { LogoUpload } from './LogoUpload';
import { BillPreview } from './BillPreview';

export function PrinterSettingsTab() {
  const { config, updateConfig, updateBillConfig, setBillPrinter, setKotPrinter } =
    usePrintStore();

  const [sameAsBill, setSameAsBill] = useState(
    config.billPrinter.type !== 'none' &&
      config.billPrinter.type === config.kotPrinter.type &&
      config.billPrinter.usbName === config.kotPrinter.usbName &&
      config.billPrinter.networkHost === config.kotPrinter.networkHost
  );

  const handleBillPrinterChange = (connection: PrinterConnection) => {
    setBillPrinter(connection);
    if (sameAsBill) {
      setKotPrinter(connection);
    }
  };

  const handleKotPrinterChange = (connection: PrinterConnection) => {
    setKotPrinter(connection);
  };

  const handleSameAsBillChange = (same: boolean) => {
    setSameAsBill(same);
    if (same) {
      setKotPrinter(config.billPrinter);
    }
  };

  const handleBillCustomizationChange = (updates: Partial<BillCustomization>) => {
    updateBillConfig(updates);
  };

  const handleOpenDrawer = async () => {
    if (!window.electron) return;
    await window.electron.openDrawerEscpos(config.billPrinter, config.drawerPulsePin);
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="space-y-3">
        <Checkbox
          isSelected={config.enablePrinting}
          onValueChange={(v) => updateConfig({ enablePrinting: v })}
        >
          Enable Printing
        </Checkbox>
      </div>

      <Divider />

      {/* Printer Connections */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Printer Connections</h3>

        <PrinterConnectionForm
          label="Bill Printer"
          connection={config.billPrinter}
          onChange={handleBillPrinterChange}
        />

        <PrinterConnectionForm
          label="KOT Printer"
          connection={config.kotPrinter}
          onChange={handleKotPrinterChange}
          showSameAsBill
          sameAsBill={sameAsBill}
          onSameAsBillChange={handleSameAsBillChange}
        />
      </div>

      <Divider />

      {/* Cash Drawer */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Cash Drawer</h3>

        <Checkbox
          isSelected={config.enableDrawer}
          onValueChange={(v) => updateConfig({ enableDrawer: v })}
        >
          Enable Cash Drawer
        </Checkbox>

        {config.enableDrawer && (
          <div className="flex items-center gap-4">
            <span className="text-sm">Pulse Pin:</span>
            <Select
              selectedKeys={[config.drawerPulsePin.toString()]}
              onSelectionChange={(keys) => {
                const pin = parseInt(Array.from(keys)[0] as string) as 2 | 5;
                updateConfig({ drawerPulsePin: pin });
              }}
              size="sm"
              className="w-24"
            >
              <SelectItem key="2">Pin 2</SelectItem>
              <SelectItem key="5">Pin 5</SelectItem>
            </Select>
            <Button
              variant="flat"
              size="sm"
              onPress={handleOpenDrawer}
              isDisabled={config.billPrinter.type === 'none'}
              startContent={<HugeiconsIcon icon={MoneyBag01Icon} className="h-4 w-4" />}
            >
              Test Drawer
            </Button>
          </div>
        )}
      </div>

      <Divider />

      {/* Bill Customization */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Receipt Customization</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <LogoUpload
              logo={config.bill.logo}
              onLogoChange={(logo) => handleBillCustomizationChange({ logo })}
            />

            <Textarea
              label="Header Text"
              placeholder="Business name, address, phone..."
              value={config.bill.headerText}
              onValueChange={(v) => handleBillCustomizationChange({ headerText: v })}
              minRows={2}
              maxRows={4}
              size="sm"
            />

            <Textarea
              label="Footer Text"
              placeholder="Thank you message, promotions..."
              value={config.bill.footerText}
              onValueChange={(v) => handleBillCustomizationChange({ footerText: v })}
              minRows={2}
              maxRows={4}
              size="sm"
            />

            <div className="space-y-2">
              <Checkbox
                isSelected={config.bill.showDateTime}
                onValueChange={(v) => handleBillCustomizationChange({ showDateTime: v })}
                size="sm"
              >
                Show date and time
              </Checkbox>
              <Checkbox
                isSelected={config.bill.showOrderNumber}
                onValueChange={(v) => handleBillCustomizationChange({ showOrderNumber: v })}
                size="sm"
              >
                Show order number
              </Checkbox>
            </div>
          </div>

          <BillPreview
            customization={config.bill}
            paperWidth={config.billPrinter.paperWidth || 80}
          />
        </div>
      </div>
    </div>
  );
}
