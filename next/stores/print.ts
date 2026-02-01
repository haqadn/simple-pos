'use client';

import { create } from 'zustand';
import type {
  PrinterConnection,
  BillCustomization,
  KotSettings,
  PrintConfig,
} from '@/lib/escpos/types';
import { DEFAULT_PRINT_CONFIG } from '@/lib/escpos/types';

export type PrintType = 'bill' | 'kot' | 'drawer';

export interface PrintJobData {
  // Common fields
  orderId?: number;
  orderReference?: string;
  frontendId?: string;     // 6-char alphanumeric frontend ID (e.g., "A3X9K2")
  serverId?: number;       // WooCommerce server ID (only if synced)
  cartName?: string;
  serviceType?: 'table' | 'delivery';
  orderTime?: string;
  customerNote?: string;

  // Bill specific
  items?: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  payment?: number;
  discountTotal?: number;
  shippingTotal?: number;
  total?: number;

  // KOT specific
  kotItems?: Array<{
    id: number;
    name: string;
    quantity: number;
    previousQuantity?: number;
  }>;
}

export interface PrintJob {
  id: string;
  type: PrintType;
  data: PrintJobData | null;
  resolve: () => void;
  reject: (error: Error) => void;
}

// Re-export types from escpos
export type { PrinterConnection, BillCustomization, KotSettings, PrintConfig };

interface PrintState {
  queue: PrintJob[];
  isProcessing: boolean;
  currentJob: PrintJob | null;
  config: PrintConfig;
}

interface PrintActions {
  push: (type: PrintType, data: PrintJobData | null) => Promise<void>;
  pop: () => void;
  clear: () => void;
  setProcessing: (isProcessing: boolean) => void;
  updateConfig: (config: Partial<PrintConfig>) => void;
  updateBillConfig: (bill: Partial<BillCustomization>) => void;
  updateKotConfig: (kot: Partial<KotSettings>) => void;
  setBillPrinter: (connection: PrinterConnection) => void;
  setKotPrinter: (connection: PrinterConnection) => void;
}

// Load config from localStorage
function loadConfig(): PrintConfig {
  if (typeof window === 'undefined') return DEFAULT_PRINT_CONFIG;
  try {
    const saved = localStorage.getItem('pos-print-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Deep merge with defaults to handle new fields
      return {
        ...DEFAULT_PRINT_CONFIG,
        ...parsed,
        bill: { ...DEFAULT_PRINT_CONFIG.bill, ...parsed.bill },
        kot: { ...DEFAULT_PRINT_CONFIG.kot, ...parsed.kot },
        billPrinter: { ...DEFAULT_PRINT_CONFIG.billPrinter, ...parsed.billPrinter },
        kotPrinter: { ...DEFAULT_PRINT_CONFIG.kotPrinter, ...parsed.kotPrinter },
      };
    }
  } catch (e) {
    console.error('Failed to load print config:', e);
  }
  return DEFAULT_PRINT_CONFIG;
}

// Save config to localStorage
function saveConfig(config: PrintConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pos-print-config', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save print config:', e);
  }
}

export const usePrintStore = create<PrintState & PrintActions>((set, get) => ({
  queue: [],
  isProcessing: false,
  currentJob: null,
  config: loadConfig(),

  push: (type, data) => {
    return new Promise<void>((resolve, reject) => {
      const job: PrintJob = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        data,
        resolve,
        reject,
      };

      set((state) => ({
        queue: [...state.queue, job],
        currentJob: state.currentJob || job,
      }));
    });
  },

  pop: () => {
    const { queue, currentJob } = get();

    if (currentJob) {
      currentJob.resolve();
    }

    const [, ...rest] = queue;
    set({
      queue: rest,
      currentJob: rest[0] || null,
      isProcessing: false,
    });
  },

  clear: () => {
    const { queue } = get();
    // Reject all pending promises so they can be garbage collected
    for (const job of queue) {
      job.reject(new Error('Print queue cleared'));
    }
    set({ queue: [], currentJob: null, isProcessing: false });
  },

  setProcessing: (isProcessing) => {
    set({ isProcessing });
  },

  updateConfig: (newConfig) => {
    const config = { ...get().config, ...newConfig };
    saveConfig(config);
    set({ config });
  },

  updateBillConfig: (bill) => {
    const config = {
      ...get().config,
      bill: { ...get().config.bill, ...bill },
    };
    saveConfig(config);
    set({ config });
  },

  updateKotConfig: (kot) => {
    const config = {
      ...get().config,
      kot: { ...get().config.kot, ...kot },
    };
    saveConfig(config);
    set({ config });
  },

  setBillPrinter: (connection) => {
    const config = { ...get().config, billPrinter: connection };
    saveConfig(config);
    set({ config });
  },

  setKotPrinter: (connection) => {
    const config = { ...get().config, kotPrinter: connection };
    saveConfig(config);
    set({ config });
  },
}));

// Helper to check if we're in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electron?.isElectron;
}

// Helper to get available printers
export async function getAvailablePrinters(): Promise<
  Array<{ name: string; displayName: string; isDefault: boolean }>
> {
  if (!isElectron()) return [];
  try {
    return await window.electron!.getPrinters();
  } catch (e) {
    console.error('Failed to get printers:', e);
    return [];
  }
}
