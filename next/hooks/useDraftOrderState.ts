import { useDraftOrderStore } from '@/stores/draft-order';

/**
 * Consolidates all draft order save-related selectors into a single hook.
 * This eliminates the need to call useDraftOrderStore 7+ times in each mutation hook.
 */
export function useDraftOrderState() {
  const getDraftData = useDraftOrderStore((state) => state.getDraftData);
  const draftOrder = useDraftOrderStore((state) => state.draftOrder);
  const getSavePromise = useDraftOrderStore((state) => state.getSavePromise);
  const setSavePromise = useDraftOrderStore((state) => state.setSavePromise);
  const getSavedOrderId = useDraftOrderStore((state) => state.getSavedOrderId);
  const setSavedOrderId = useDraftOrderStore((state) => state.setSavedOrderId);
  const acquireSaveLock = useDraftOrderStore((state) => state.acquireSaveLock);
  const releaseSaveLock = useDraftOrderStore((state) => state.releaseSaveLock);
  const currentFrontendId = useDraftOrderStore((state) => state.currentFrontendId);
  const setCurrentFrontendId = useDraftOrderStore((state) => state.setCurrentFrontendId);
  const getCurrentFrontendId = useDraftOrderStore((state) => state.getCurrentFrontendId);

  return {
    getDraftData,
    draftOrder,
    getSavePromise,
    setSavePromise,
    getSavedOrderId,
    setSavedOrderId,
    acquireSaveLock,
    releaseSaveLock,
    currentFrontendId,
    setCurrentFrontendId,
    getCurrentFrontendId,
  };
}

/**
 * Hook for draft order update actions (line items, shipping, etc.)
 */
export function useDraftOrderActions() {
  const updateDraftLineItems = useDraftOrderStore((state) => state.updateDraftLineItems);
  const updateDraftShippingLines = useDraftOrderStore((state) => state.updateDraftShippingLines);
  const updateDraftNote = useDraftOrderStore((state) => state.updateDraftNote);
  const updateDraftBilling = useDraftOrderStore((state) => state.updateDraftBilling);
  const updateDraftMetaData = useDraftOrderStore((state) => state.updateDraftMetaData);
  const resetDraft = useDraftOrderStore((state) => state.resetDraft);
  const hasContent = useDraftOrderStore((state) => state.hasContent);

  return {
    updateDraftLineItems,
    updateDraftShippingLines,
    updateDraftNote,
    updateDraftBilling,
    updateDraftMetaData,
    resetDraft,
    hasContent,
  };
}
