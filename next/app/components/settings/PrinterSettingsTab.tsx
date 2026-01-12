'use client';

import { useState, useEffect } from 'react';
import {
  Textarea,
  Checkbox,
  RadioGroup,
  Radio,
  Select,
  SelectItem,
  Button,
  Divider,
} from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoneyBag01Icon } from '@hugeicons/core-free-icons';
import { usePrintStore } from '@/stores/print';
import type { PrintConfig, PrinterConnection, BillCustomization, KotSettings } from '@/lib/escpos';
import { PrinterConnectionForm } from './PrinterConnectionForm';
import { LogoUpload } from './LogoUpload';
import { BillPreview } from './BillPreview';

interface PrinterSettingsTabProps {
  onSave?: () => void;
}

export function PrinterSettingsTab({ onSave }: PrinterSettingsTabProps) {
  const { config, updateConfig, updateBillConfig, updateKotConfig, setBillPrinter, setKotPrinter } =
    usePrintStore();

  // Local state for editing
  const [localConfig, setLocalConfig] = useState<PrintConfig>(config);
  const [sameAsBill, setSameAsBill] = useState(
    config.billPrinter.type !== 'none' &&
      config.billPrinter.type === config.kotPrinter.type &&
      config.billPrinter.usbName === config.kotPrinter.usbName &&
      config.billPrinter.networkHost === config.kotPrinter.networkHost
  );

  // Sync local state when config changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    // Apply all changes
    updateConfig({
      enablePrinting: localConfig.enablePrinting,
      enableDrawer: localConfig.enableDrawer,
      drawerPulsePin: localConfig.drawerPulsePin,
      paperWidth: localConfig.paperWidth,
    });
    setBillPrinter(localConfig.billPrinter);
    setKotPrinter(sameAsBill ? localConfig.billPrinter : localConfig.kotPrinter);
    updateBillConfig(localConfig.bill);
    updateKotConfig(localConfig.kot);
    onSave?.();
  };

  const handleBillPrinterChange = (connection: PrinterConnection) => {
    setLocalConfig((prev) => ({
      ...prev,
      billPrinter: connection,
      kotPrinter: sameAsBill ? connection : prev.kotPrinter,
    }));
  };

  const handleKotPrinterChange = (connection: PrinterConnection) => {
    setLocalConfig((prev) => ({
      ...prev,
      kotPrinter: connection,
    }));
  };

  const handleSameAsBillChange = (same: boolean) => {
    setSameAsBill(same);
    if (same) {
      setLocalConfig((prev) => ({
        ...prev,
        kotPrinter: prev.billPrinter,
      }));
    }
  };

  const handleBillCustomizationChange = (updates: Partial<BillCustomization>) => {
    setLocalConfig((prev) => ({
      ...prev,
      bill: { ...prev.bill, ...updates },
    }));
  };

  const handleKotSettingsChange = (updates: Partial<KotSettings>) => {
    setLocalConfig((prev) => ({
      ...prev,
      kot: { ...prev.kot, ...updates },
    }));
  };

  const handleOpenDrawer = async () => {
    if (!window.electron) return;
    await window.electron.openDrawerEscpos(localConfig.billPrinter, localConfig.drawerPulsePin);
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <div className="space-y-3">
        <Checkbox
          isSelected={localConfig.enablePrinting}
          onValueChange={(v) => setLocalConfig((prev) => ({ ...prev, enablePrinting: v }))}
        >
          Enable Printing
        </Checkbox>

        <div className="flex items-center gap-4">
          <span className="text-sm">Paper Width:</span>
          <RadioGroup
            orientation="horizontal"
            value={localConfig.paperWidth.toString()}
            onValueChange={(v) =>
              setLocalConfig((prev) => ({ ...prev, paperWidth: parseInt(v) as 58 | 80 }))
            }
            size="sm"
          >
            <Radio value="58">58mm</Radio>
            <Radio value="80">80mm</Radio>
          </RadioGroup>
        </div>
      </div>

      <Divider />

      {/* Printer Connections */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Printer Connections</h3>

        <PrinterConnectionForm
          label="Bill Printer"
          connection={localConfig.billPrinter}
          onChange={handleBillPrinterChange}
        />

        <PrinterConnectionForm
          label="KOT Printer"
          connection={localConfig.kotPrinter}
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
          isSelected={localConfig.enableDrawer}
          onValueChange={(v) => setLocalConfig((prev) => ({ ...prev, enableDrawer: v }))}
        >
          Enable Cash Drawer
        </Checkbox>

        {localConfig.enableDrawer && (
          <div className="flex items-center gap-4">
            <span className="text-sm">Pulse Pin:</span>
            <Select
              selectedKeys={[localConfig.drawerPulsePin.toString()]}
              onSelectionChange={(keys) => {
                const pin = parseInt(Array.from(keys)[0] as string) as 2 | 5;
                setLocalConfig((prev) => ({ ...prev, drawerPulsePin: pin }));
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
              isDisabled={localConfig.billPrinter.type === 'none'}
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
              logo={localConfig.bill.logo}
              onLogoChange={(logo) => handleBillCustomizationChange({ logo })}
            />

            <Textarea
              label="Header Text"
              placeholder="Business name, address, phone..."
              value={localConfig.bill.headerText}
              onValueChange={(v) => handleBillCustomizationChange({ headerText: v })}
              minRows={2}
              maxRows={4}
              size="sm"
            />

            <Textarea
              label="Footer Text"
              placeholder="Thank you message, promotions..."
              value={localConfig.bill.footerText}
              onValueChange={(v) => handleBillCustomizationChange({ footerText: v })}
              minRows={2}
              maxRows={4}
              size="sm"
            />

            <div className="space-y-2">
              <Checkbox
                isSelected={localConfig.bill.showDateTime}
                onValueChange={(v) => handleBillCustomizationChange({ showDateTime: v })}
                size="sm"
              >
                Show date and time
              </Checkbox>
              <Checkbox
                isSelected={localConfig.bill.showOrderNumber}
                onValueChange={(v) => handleBillCustomizationChange({ showOrderNumber: v })}
                size="sm"
              >
                Show order number
              </Checkbox>
            </div>
          </div>

          <BillPreview
            customization={localConfig.bill}
            paperWidth={localConfig.paperWidth}
          />
        </div>
      </div>

      <Divider />

      {/* KOT Settings */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">KOT Settings</h3>

        <div className="space-y-2">
          <Checkbox
            isSelected={localConfig.kot.showTableName}
            onValueChange={(v) => handleKotSettingsChange({ showTableName: v })}
            size="sm"
          >
            Show table/cart name
          </Checkbox>
          <Checkbox
            isSelected={localConfig.kot.showOrderNumber}
            onValueChange={(v) => handleKotSettingsChange({ showOrderNumber: v })}
            size="sm"
          >
            Show order number
          </Checkbox>
          <Checkbox
            isSelected={localConfig.kot.showCustomerNote}
            onValueChange={(v) => handleKotSettingsChange({ showCustomerNote: v })}
            size="sm"
          >
            Show customer note
          </Checkbox>
          <Checkbox
            isSelected={localConfig.kot.highlightChanges}
            onValueChange={(v) => handleKotSettingsChange({ highlightChanges: v })}
            size="sm"
          >
            Highlight quantity changes (strikethrough old, bold new)
          </Checkbox>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <Button color="primary" onPress={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
