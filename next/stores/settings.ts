import { create } from 'zustand';

const STORAGE_KEY = 'pos-settings';

export interface PageShortcut {
  id: string;
  name: string;
  url: string;
}

export interface ApiConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface PaymentMethodConfig {
  key: string;      // Unique identifier (auto-generated slug from label)
  label: string;    // Display name (user-provided)
}

export interface Settings {
  api: ApiConfig;
  skipKotCategories: number[];
  pageShortcuts: PageShortcut[];
  paymentMethods: PaymentMethodConfig[];
}

interface SettingsStore extends Settings {
  // API config
  updateApi: (config: Partial<ApiConfig>) => void;

  // KOT categories
  setSkipKotCategories: (categoryIds: number[]) => void;
  toggleSkipKotCategory: (categoryId: number) => void;

  // Page shortcuts
  addShortcut: (name: string, url: string) => void;
  updateShortcut: (id: string, name: string, url: string) => void;
  removeShortcut: (id: string) => void;

  // Payment methods
  addPaymentMethod: (label: string) => void;
  updatePaymentMethod: (key: string, label: string) => void;
  removePaymentMethod: (key: string) => void;
  reorderPaymentMethods: (methods: PaymentMethodConfig[]) => void;

  // General
  isConfigured: () => boolean;
}

// Default payment methods (matching original hardcoded values in payment-card.tsx)
const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { key: 'bkash', label: 'bKash' },
  { key: 'nagad', label: 'Nagad' },
  { key: 'card', label: 'Card' },
];

const DEFAULT_SETTINGS: Settings = {
  api: {
    baseUrl: '',
    consumerKey: '',
    consumerSecret: '',
  },
  skipKotCategories: [],
  pageShortcuts: [],
  paymentMethods: DEFAULT_PAYMENT_METHODS,
};

function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        api: { ...DEFAULT_SETTINGS.api, ...parsed.api },
      };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }

  // Migration: Check for env vars on first load
  const envBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const envConsumerKey = process.env.NEXT_PUBLIC_CONSUMER_KEY || '';
  const envConsumerSecret = process.env.NEXT_PUBLIC_CONSUMER_SECRET || '';

  if (envBaseUrl || envConsumerKey || envConsumerSecret) {
    return {
      ...DEFAULT_SETTINGS,
      api: {
        baseUrl: envBaseUrl,
        consumerKey: envConsumerKey,
        consumerSecret: envConsumerSecret,
      },
    };
  }

  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Settings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...loadSettings(),

  updateApi: (config) => {
    const newApi = { ...get().api, ...config };
    // Strip trailing slash from URL
    if (newApi.baseUrl) {
      newApi.baseUrl = newApi.baseUrl.replace(/\/+$/, '');
    }
    saveSettings({ ...get(), api: newApi });
    set({ api: newApi });
  },

  setSkipKotCategories: (categoryIds) => {
    saveSettings({ ...get(), skipKotCategories: categoryIds });
    set({ skipKotCategories: categoryIds });
  },

  toggleSkipKotCategory: (categoryId) => {
    const current = get().skipKotCategories;
    const newCategories = current.includes(categoryId)
      ? current.filter(id => id !== categoryId)
      : [...current, categoryId];
    saveSettings({ ...get(), skipKotCategories: newCategories });
    set({ skipKotCategories: newCategories });
  },

  addShortcut: (name, url) => {
    const newShortcut: PageShortcut = {
      id: generateId(),
      name,
      url,
    };
    const newShortcuts = [...get().pageShortcuts, newShortcut];
    saveSettings({ ...get(), pageShortcuts: newShortcuts });
    set({ pageShortcuts: newShortcuts });
  },

  updateShortcut: (id, name, url) => {
    const newShortcuts = get().pageShortcuts.map(s =>
      s.id === id ? { ...s, name, url } : s
    );
    saveSettings({ ...get(), pageShortcuts: newShortcuts });
    set({ pageShortcuts: newShortcuts });
  },

  removeShortcut: (id) => {
    const newShortcuts = get().pageShortcuts.filter(s => s.id !== id);
    saveSettings({ ...get(), pageShortcuts: newShortcuts });
    set({ pageShortcuts: newShortcuts });
  },

  addPaymentMethod: (label) => {
    // Generate key from label (lowercase, replace spaces with underscores)
    const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const newMethod: PaymentMethodConfig = { key, label };
    const newMethods = [...get().paymentMethods, newMethod];
    saveSettings({ ...get(), paymentMethods: newMethods });
    set({ paymentMethods: newMethods });
  },

  updatePaymentMethod: (key, label) => {
    const newMethods = get().paymentMethods.map(m =>
      m.key === key ? { ...m, label } : m
    );
    saveSettings({ ...get(), paymentMethods: newMethods });
    set({ paymentMethods: newMethods });
  },

  removePaymentMethod: (key) => {
    const newMethods = get().paymentMethods.filter(m => m.key !== key);
    saveSettings({ ...get(), paymentMethods: newMethods });
    set({ paymentMethods: newMethods });
  },

  reorderPaymentMethods: (methods) => {
    saveSettings({ ...get(), paymentMethods: methods });
    set({ paymentMethods: methods });
  },

  isConfigured: () => {
    const { api } = get();
    return !!(api.baseUrl && api.consumerKey && api.consumerSecret);
  },
}));
