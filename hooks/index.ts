// Barrel export for hooks
export { useDebounce } from './useDebounce';
export { useAvoidParallel } from './useAvoidParallel';
export { useCommandManager } from './useCommandManager';
export { useGlobalShortcuts } from './useGlobalShortcuts';
export { useAddProductToOrder } from './useAddProductToOrder';
export { useDraftOrderState, useDraftOrderActions } from './useDraftOrderState';
export { useSaveDraftOrder, useEnsureDraftSaved, isDraftOrder } from './useDraftOrderSave';
export { useMaintainOrder } from './useMaintainOrder';
export { useConnectivity, type ConnectivityStatus, type SyncCounts, type UseConnectivityReturn } from './useConnectivity';
export { useTestConnection, type ConnectionStatus, type UseTestConnectionResult } from './useTestConnection';
export { useCommandMessages, type CommandMessage } from './useCommandMessages';
export { useOrderRouteInfo } from './useOrderRouteInfo';
export { usePaymentHandler } from './usePaymentHandler';
export { useOrderCompletion } from './useOrderCompletion';
export { useCouponHandler } from './useCouponHandler';
export { usePrintHandler } from './usePrintHandler';
export { useOrderNoteAndCustomer } from './useOrderNoteAndCustomer';
