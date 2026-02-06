'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Checkbox,
  Tabs,
  Tab,
} from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { useSettingsStore, type PageShortcut, type ApiConfig, type PaymentMethodConfig } from '@/stores/settings';
import { useCategoriesQuery } from '@/stores/products';
import { useTestConnection } from '@/hooks';
import { PrinterSettingsTab } from './settings/PrinterSettingsTab';
import { PaymentMethodsTab } from './settings/PaymentMethodsTab';
import { ApiConfigSection } from './settings/ApiConfigSection';

const decodeHtmlEntities = (text: string) => {
  if (typeof document === 'undefined') return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

interface KotCategoriesSectionProps {
  localSkipCategories: number[];
  setLocalSkipCategories: (ids: number[]) => void;
}

function KotCategoriesSection({ localSkipCategories, setLocalSkipCategories }: KotCategoriesSectionProps) {
  const { data: categories, isLoading } = useCategoriesQuery();

  const handleToggle = (categoryId: number) => {
    if (localSkipCategories.includes(categoryId)) {
      setLocalSkipCategories(localSkipCategories.filter(id => id !== categoryId));
    } else {
      setLocalSkipCategories([...localSkipCategories, categoryId]);
    }
  };

  if (isLoading) {
    return <p className="text-default-500">Loading categories...</p>;
  }

  if (!categories || categories.length === 0) {
    return <p className="text-default-500">No categories found. Configure API settings first.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-small text-default-500 mb-2">
        Selected categories will be excluded from Kitchen Order Tickets (KOT).
      </p>
      {categories.map((category) => (
        <Checkbox
          key={category.id}
          isSelected={localSkipCategories.includes(category.id)}
          onValueChange={() => handleToggle(category.id)}
        >
          {decodeHtmlEntities(category.name)}
        </Checkbox>
      ))}
    </div>
  );
}

interface PageShortcutsSectionProps {
  localShortcuts: PageShortcut[];
  setLocalShortcuts: (shortcuts: PageShortcut[]) => void;
}

function PageShortcutsSection({ localShortcuts, setLocalShortcuts }: PageShortcutsSectionProps) {
  const handleAdd = () => {
    const newShortcut: PageShortcut = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      name: '',
      url: '',
    };
    setLocalShortcuts([...localShortcuts, newShortcut]);
  };

  const handleUpdate = (id: string, field: 'name' | 'url', value: string) => {
    setLocalShortcuts(
      localShortcuts.map(s => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleRemove = (id: string) => {
    setLocalShortcuts(localShortcuts.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-small text-default-500">
          Add shortcuts to external pages. They will appear in the sidebar.
        </p>
        <Button
          isIconOnly
          size="sm"
          variant="flat"
          onPress={handleAdd}
          aria-label="Add shortcut"
        >
          <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" />
        </Button>
      </div>

      {localShortcuts.length === 0 ? (
        <p className="text-default-400 text-center py-4">No shortcuts configured</p>
      ) : (
        localShortcuts.map((shortcut) => (
          <div key={shortcut.id} className="flex gap-2 items-start">
            <Input
              size="sm"
              label="Name"
              placeholder="Daily Sheet"
              value={shortcut.name}
              onValueChange={(value) => handleUpdate(shortcut.id, 'name', value)}
              className="flex-1"
            />
            <Input
              size="sm"
              label="URL"
              placeholder="https://..."
              value={shortcut.url}
              onValueChange={(value) => handleUpdate(shortcut.id, 'url', value)}
              className="flex-[2]"
            />
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="danger"
              onPress={() => handleRemove(shortcut.id)}
              aria-label="Remove shortcut"
              className="mt-6"
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SettingsModal({ isOpen, onOpenChange }: SettingsModalProps) {
  const {
    api,
    skipKotCategories,
    pageShortcuts,
    paymentMethods,
    updateApi,
    setSkipKotCategories,
    reorderPaymentMethods,
  } = useSettingsStore();

  // Local state for editing
  const [localApi, setLocalApi] = useState<ApiConfig>(api);
  const [localSkipCategories, setLocalSkipCategories] = useState<number[]>(skipKotCategories);
  const [localShortcuts, setLocalShortcuts] = useState<PageShortcut[]>(pageShortcuts);
  const [localPaymentMethods, setLocalPaymentMethods] = useState<PaymentMethodConfig[]>(paymentMethods);

  // Connection test hook for API credentials
  const { test: testConnection, status: connectionStatus, error: connectionError, reset: resetConnection } = useTestConnection();

  // Handler for test connection button
  const handleTestConnection = async () => {
    return await testConnection(localApi);
  };

  // Handler for API config changes - resets connection status when credentials change
  const handleApiChange = (newApi: ApiConfig) => {
    setLocalApi(newApi);
    // Reset connection status when user changes credentials
    if (connectionStatus !== 'idle') {
      resetConnection();
    }
  };

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalApi(api);
      setLocalSkipCategories(skipKotCategories);
      setLocalShortcuts(pageShortcuts);
      setLocalPaymentMethods(paymentMethods);
      // Reset connection status when modal opens
      resetConnection();
    }
  }, [isOpen, api, skipKotCategories, pageShortcuts, paymentMethods, resetConnection]);

  const handleSave = (onClose: () => void) => {
    // Save API config
    updateApi(localApi);

    // Save KOT categories
    setSkipKotCategories(localSkipCategories);

    // Save shortcuts - need to sync with store
    const store = useSettingsStore.getState();

    // Remove deleted shortcuts
    const currentIds = new Set(localShortcuts.map(s => s.id));
    store.pageShortcuts.forEach(s => {
      if (!currentIds.has(s.id)) {
        store.removeShortcut(s.id);
      }
    });

    // Add/update shortcuts
    const existingIds = new Set(store.pageShortcuts.map(s => s.id));
    localShortcuts.forEach(shortcut => {
      if (existingIds.has(shortcut.id)) {
        store.updateShortcut(shortcut.id, shortcut.name, shortcut.url);
      } else {
        // For new shortcuts, we need to add them properly
        store.addShortcut(shortcut.name, shortcut.url);
      }
    });

    // Save payment methods - sync with store
    // Remove deleted methods
    const currentKeys = new Set(localPaymentMethods.map(m => m.key));
    store.paymentMethods.forEach(m => {
      if (!currentKeys.has(m.key)) {
        store.removePaymentMethod(m.key);
      }
    });

    // Add/update methods
    const existingKeys = new Set(store.paymentMethods.map(m => m.key));
    localPaymentMethods.forEach(method => {
      if (existingKeys.has(method.key)) {
        store.updatePaymentMethod(method.key, method.label);
      } else {
        store.addPaymentMethod(method.label);
      }
    });

    // Reorder methods to match local order
    reorderPaymentMethods(localPaymentMethods);

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="4xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Settings</ModalHeader>
            <ModalBody>
              <Tabs aria-label="Settings sections">
                <Tab key="api" title="API">
                  <div className="py-4">
                    <ApiConfigSection
                      localApi={localApi}
                      setLocalApi={handleApiChange}
                      onTestConnection={handleTestConnection}
                      connectionStatus={connectionStatus}
                      connectionError={connectionError ?? undefined}
                    />
                  </div>
                </Tab>
                <Tab key="kot" title="Skip KOT">
                  <div className="py-4">
                    <KotCategoriesSection
                      localSkipCategories={localSkipCategories}
                      setLocalSkipCategories={setLocalSkipCategories}
                    />
                  </div>
                </Tab>
                <Tab key="shortcuts" title="Shortcuts">
                  <div className="py-4">
                    <PageShortcutsSection
                      localShortcuts={localShortcuts}
                      setLocalShortcuts={setLocalShortcuts}
                    />
                  </div>
                </Tab>
                <Tab key="printers" title="Printers">
                  <div className="py-4">
                    <PrinterSettingsTab />
                  </div>
                </Tab>
                <Tab key="payment-methods" title="Payment Methods">
                  <div className="py-4">
                    <PaymentMethodsTab
                      localMethods={localPaymentMethods}
                      setLocalMethods={setLocalPaymentMethods}
                    />
                  </div>
                </Tab>
              </Tabs>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" onPress={() => handleSave(onClose)}>
                Save
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
