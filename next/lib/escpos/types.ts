// Shared types for ESC/POS printing

export interface PrinterConnection {
  type: 'usb' | 'network' | 'none';
  usbName?: string;
  networkHost?: string;
  networkPort?: number;
}

export interface BillCustomization {
  logo?: string;
  logoWidth?: number; // Default: 576 for 80mm, 384 for 58mm (full printable width)
  headerText: string;
  footerText: string;
  showDateTime: boolean;
  showOrderNumber: boolean;
}

export interface KotSettings {
  showOrderNumber: boolean;
  showTableName: boolean;
  showCustomerNote: boolean;
  highlightChanges: boolean;
}

export interface PrintConfig {
  billPrinter: PrinterConnection;
  kotPrinter: PrinterConnection;
  enableDrawer: boolean;
  drawerPulsePin: 2 | 5;
  paperWidth: 58 | 80;
  bill: BillCustomization;
  kot: KotSettings;
  enablePrinting: boolean;
}

export interface BillData {
  orderId?: number;
  orderReference?: string;
  cartName?: string;
  orderTime?: string;
  customer?: {
    name?: string;
    phone?: string;
  };
  items?: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
  discountTotal?: number;
  payment?: number;
  total?: number;
}

export interface KotData {
  orderId?: number;
  orderReference?: string;
  cartName?: string;
  customerNote?: string;
  kotItems?: Array<{
    id: number;
    name: string;
    quantity: number;
    previousQuantity?: number;
  }>;
}

export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  billPrinter: { type: 'none' },
  kotPrinter: { type: 'none' },
  enableDrawer: true,
  drawerPulsePin: 2,
  paperWidth: 80,
  bill: {
    headerText: '',
    footerText: 'Thank you for your visit!',
    showDateTime: true,
    showOrderNumber: true,
  },
  kot: {
    showOrderNumber: true,
    showTableName: true,
    showCustomerNote: true,
    highlightChanges: true,
  },
  enablePrinting: true,
};
