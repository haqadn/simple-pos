'use client';

import { create } from 'zustand';

export type PrintType = 'bill' | 'kot' | 'drawer';

export interface PrintJobData {
  // Common fields
  orderId?: number;
  orderReference?: string;
  cartName?: string;
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
  };
  payment?: number;
  discountTotal?: number;
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

interface PrintState {
  queue: PrintJob[];
  isProcessing: boolean;
  currentJob: PrintJob | null;

  // Config
  config: {
    billPrinter: string;
    kitchenPrinter: string;
    drawerPrinter: string;
    printWidth: number;
    printHeight: number;
    silentPrinting: boolean;
    enablePrinting: boolean;
  };
}

interface PrintActions {
  push: (type: PrintType, data: PrintJobData | null) => Promise<void>;
  pop: () => void;
  setProcessing: (isProcessing: boolean) => void;
  updateConfig: (config: Partial<PrintState['config']>) => void;
}

const DEFAULT_CONFIG: PrintState['config'] = {
  billPrinter: '',
  kitchenPrinter: '',
  drawerPrinter: '',
  printWidth: 80,
  printHeight: 297,
  silentPrinting: true,
  enablePrinting: true,
};

// Load config from localStorage
function loadConfig(): PrintState['config'] {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const saved = localStorage.getItem('pos-print-config');
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load print config:', e);
  }
  return DEFAULT_CONFIG;
}

// Save config to localStorage
function saveConfig(config: PrintState['config']): void {
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

  setProcessing: (isProcessing) => {
    set({ isProcessing });
  },

  updateConfig: (newConfig) => {
    const config = { ...get().config, ...newConfig };
    saveConfig(config);
    set({ config });
  },
}));

// Helper to check if we're in Electron
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electron?.isElectron;
}

// Helper to get available printers
export async function getAvailablePrinters(): Promise<Array<{ name: string; displayName: string; isDefault: boolean }>> {
  if (!isElectron()) return [];
  try {
    return await window.electron!.getPrinters();
  } catch (e) {
    console.error('Failed to get printers:', e);
    return [];
  }
}
