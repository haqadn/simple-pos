// ESC/POS printing library exports

export { EscPosBuilder, Commands, ESC, GS, FS, LF } from './commands';
export { encodeImageForPrint, resizeImage } from './encoder';
export { renderBill, renderDrawerKick } from './bill-renderer';
export { renderKot, hasKotChanges } from './kot-renderer';
export type {
  PrinterConnection,
  BillCustomization,
  KotSettings,
  PrintConfig,
  BillData,
  KotData,
} from './types';
export { DEFAULT_PRINT_CONFIG } from './types';
