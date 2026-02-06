interface PrintConfig {
  deviceName?: string;
  silent?: boolean;
  printBackground?: boolean;
  preferCssPageSize?: boolean;
  pageSize?: {
    width: number;
    height: number;
  };
  margins?: {
    marginType: 'default' | 'none' | 'printableArea' | 'custom';
  };
  dpi?: {
    horizontal: number;
    vertical: number;
  };
}

interface PrintResult {
  success: boolean;
  failureReason?: string;
}

interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

interface EscPosResult {
  success: boolean;
  error?: string;
}

interface PrinterConnection {
  type: 'usb' | 'network' | 'none';
  usbName?: string;
  networkHost?: string;
  networkPort?: number;
}

interface ElectronAPI {
  isElectron: boolean;
  getPrinters: () => Promise<PrinterInfo[]>;
  print: (config: PrintConfig) => void;
  onPrintResult: (callback: (result: PrintResult) => void) => void;
  openDrawer: (printerName?: string) => void;
  onDrawerResult: (callback: (result: { success: boolean }) => void) => void;
  onLog: (callback: (message: unknown) => void) => void;

  // ESC/POS printing
  escposPrintUsb: (printerName: string, data: Uint8Array) => Promise<EscPosResult>;
  escposPrintNetwork: (host: string, port: number, data: Uint8Array) => Promise<EscPosResult>;
  testPrinter: (connection: PrinterConnection) => Promise<EscPosResult>;
  openDrawerEscpos: (connection: PrinterConnection, pin: 2 | 5) => Promise<EscPosResult>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
