'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectItem,
  Input,
  RadioGroup,
  Radio,
  Button,
} from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, TestTubeIcon } from '@hugeicons/core-free-icons';
import { getAvailablePrinters, isElectron } from '@/stores/print';
import type { PrinterConnection } from '@/lib/escpos';

interface PrinterConnectionFormProps {
  label: string;
  connection: PrinterConnection;
  onChange: (connection: PrinterConnection) => void;
  showSameAsBill?: boolean;
  sameAsBill?: boolean;
  onSameAsBillChange?: (same: boolean) => void;
}

export function PrinterConnectionForm({
  label,
  connection,
  onChange,
  showSameAsBill,
  sameAsBill,
  onSameAsBillChange,
}: PrinterConnectionFormProps) {
  const [printers, setPrinters] = useState<Array<{ name: string; displayName: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const loadPrinters = async () => {
    setIsLoading(true);
    try {
      const list = await getAvailablePrinters();
      setPrinters(list);
    } catch (error) {
      console.error('Failed to load printers:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isElectron()) {
      loadPrinters();
    }
  }, []);

  const handleTypeChange = (type: string) => {
    onChange({
      ...connection,
      type: type as 'usb' | 'network' | 'none',
    });
  };

  const handleUsbChange = (value: string) => {
    onChange({
      ...connection,
      usbName: value,
    });
  };

  const handleNetworkChange = (field: 'networkHost' | 'networkPort', value: string) => {
    onChange({
      ...connection,
      [field]: field === 'networkPort' ? parseInt(value) || 9100 : value,
    });
  };

  const handleTestPrint = async () => {
    if (!window.electron) return;
    setTestResult(null);
    try {
      const result = await window.electron.testPrinter(connection);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: String(error) });
    }
  };

  if (showSameAsBill && sameAsBill) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={sameAsBill}
              onChange={(e) => onSameAsBillChange?.(e.target.checked)}
              className="rounded"
            />
            Same as Bill Printer
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-default-50 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {showSameAsBill && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={sameAsBill}
              onChange={(e) => onSameAsBillChange?.(e.target.checked)}
              className="rounded"
            />
            Same as Bill Printer
          </label>
        )}
      </div>

      <RadioGroup
        orientation="horizontal"
        value={connection.type}
        onValueChange={handleTypeChange}
        size="sm"
      >
        <Radio value="none">None</Radio>
        <Radio value="usb">USB</Radio>
        <Radio value="network">Network</Radio>
      </RadioGroup>

      {connection.type === 'usb' && (
        <div className="flex gap-2 items-end">
          <Select
            label="Printer"
            placeholder="Select a printer"
            selectedKeys={connection.usbName ? [connection.usbName] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              if (selected) handleUsbChange(selected);
            }}
            size="sm"
            className="flex-1"
            isLoading={isLoading}
          >
            {printers.map((printer) => (
              <SelectItem key={printer.name}>{printer.displayName}</SelectItem>
            ))}
          </Select>
          <Button
            isIconOnly
            variant="flat"
            size="sm"
            onPress={loadPrinters}
            isLoading={isLoading}
          >
            <HugeiconsIcon icon={RefreshIcon} className="h-4 w-4" />
          </Button>
        </div>
      )}

      {connection.type === 'network' && (
        <div className="flex gap-2">
          <Input
            label="IP Address"
            placeholder="192.168.1.100"
            value={connection.networkHost || ''}
            onValueChange={(v) => handleNetworkChange('networkHost', v)}
            size="sm"
            className="flex-1"
          />
          <Input
            label="Port"
            placeholder="9100"
            value={connection.networkPort?.toString() || '9100'}
            onValueChange={(v) => handleNetworkChange('networkPort', v)}
            size="sm"
            className="w-24"
          />
        </div>
      )}

      {connection.type !== 'none' && (
        <div className="flex items-center gap-2">
          <Button
            variant="flat"
            size="sm"
            onPress={handleTestPrint}
            startContent={<HugeiconsIcon icon={TestTubeIcon} className="h-4 w-4" />}
          >
            Test Print
          </Button>
          {testResult && (
            <span
              className={`text-xs ${testResult.success ? 'text-success' : 'text-danger'}`}
            >
              {testResult.success ? 'Success!' : testResult.error || 'Failed'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
