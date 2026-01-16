import { create } from 'zustand';
import { OrderSchema, LineItemSchema, ShippingLineSchema, BillingSchema, MetaDataSchema } from '@/api/orders';

// Draft order uses id: 0 to indicate it's not saved
export const DRAFT_ORDER_ID = 0;

// Singleton to track save operation across renders
let savePromise: Promise<OrderSchema | null> | null = null;
let savedOrderId: number | null = null;
let saveLock = false; // Synchronous lock to prevent race conditions

export interface DraftOrderState {
  draftOrder: OrderSchema;
  isDraft: boolean;

  // Actions
  resetDraft: () => void;
  updateDraftLineItems: (lineItems: LineItemSchema[]) => void;
  updateDraftShippingLines: (shippingLines: ShippingLineSchema[]) => void;
  updateDraftNote: (note: string) => void;
  updateDraftBilling: (billing: Partial<BillingSchema>) => void;
  updateDraftMetaData: (metaData: MetaDataSchema[]) => void;
  getDraftData: () => Partial<OrderSchema>;
  hasContent: () => boolean;

  // Save lock mechanism
  isSaving: () => boolean;
  getSavePromise: () => Promise<OrderSchema | null> | null;
  setSavePromise: (promise: Promise<OrderSchema | null> | null) => void;
  getSavedOrderId: () => number | null;
  setSavedOrderId: (id: number | null) => void;
  acquireSaveLock: () => boolean; // Returns true if lock acquired, false if already locked
  releaseSaveLock: () => void;
}

const createEmptyDraft = (): OrderSchema => ({
  id: DRAFT_ORDER_ID,
  status: 'pending',
  customer_id: 0,
  line_items: [],
  shipping_lines: [],
  coupon_lines: [],
  customer_note: '',
  billing: {
    first_name: '',
    last_name: '',
    phone: '',
    address_1: '',
    address_2: '',
    city: '',
    state: '',
    postcode: '',
    country: '',
  },
  total: '0.00',
  discount_total: '0.00',
  meta_data: [],
});

export const useDraftOrderStore = create<DraftOrderState>((set, get) => ({
  draftOrder: createEmptyDraft(),
  isDraft: true,

  resetDraft: () => {
    // Clear save state when resetting
    savePromise = null;
    savedOrderId = null;
    saveLock = false;
    set({ draftOrder: createEmptyDraft(), isDraft: true });
  },

  // Save lock mechanism
  isSaving: () => savePromise !== null || saveLock,
  getSavePromise: () => savePromise,
  setSavePromise: (promise) => { savePromise = promise; },
  getSavedOrderId: () => savedOrderId,
  setSavedOrderId: (id) => { savedOrderId = id; },
  acquireSaveLock: () => {
    if (saveLock || savedOrderId !== null) return false;
    saveLock = true;
    return true;
  },
  releaseSaveLock: () => { saveLock = false; },

  updateDraftLineItems: (lineItems: LineItemSchema[]) => {
    set((state) => ({
      draftOrder: { ...state.draftOrder, line_items: lineItems },
    }));
  },

  updateDraftShippingLines: (shippingLines: ShippingLineSchema[]) => {
    set((state) => ({
      draftOrder: { ...state.draftOrder, shipping_lines: shippingLines },
    }));
  },

  updateDraftNote: (note: string) => {
    set((state) => ({
      draftOrder: { ...state.draftOrder, customer_note: note },
    }));
  },

  updateDraftBilling: (billing: Partial<BillingSchema>) => {
    set((state) => ({
      draftOrder: {
        ...state.draftOrder,
        billing: { ...state.draftOrder.billing, ...billing },
      },
    }));
  },

  updateDraftMetaData: (metaData: MetaDataSchema[]) => {
    set((state) => ({
      draftOrder: { ...state.draftOrder, meta_data: metaData },
    }));
  },

  getDraftData: () => {
    const { draftOrder } = get();
    return {
      status: draftOrder.status,
      line_items: draftOrder.line_items,
      shipping_lines: draftOrder.shipping_lines,
      customer_note: draftOrder.customer_note,
      billing: draftOrder.billing,
      meta_data: draftOrder.meta_data,
    };
  },

  hasContent: () => {
    const { draftOrder } = get();

    // Check if order has any meaningful content
    const hasLineItems = draftOrder.line_items.length > 0;
    const hasShipping = draftOrder.shipping_lines.length > 0;
    const hasNote = draftOrder.customer_note.trim() !== '';
    const hasCustomerInfo = !!(
      draftOrder.billing.first_name?.trim() ||
      draftOrder.billing.last_name?.trim() ||
      draftOrder.billing.phone?.trim() ||
      draftOrder.billing.address_1?.trim()
    );
    const hasPayment = draftOrder.meta_data.some(
      (meta) => meta.key === 'payment_received' && parseFloat(String(meta.value)) > 0
    );

    return hasLineItems || hasShipping || hasNote || hasCustomerInfo || hasPayment;
  },
}));
