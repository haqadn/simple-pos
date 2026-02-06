'use client';

/**
 * SetupModal Component
 *
 * A full-page blocking modal for first-run API credential configuration.
 * Displayed when the app loads without configured credentials (!isConfigured()).
 *
 * Features:
 * - Non-closable modal (no close button, no backdrop click)
 * - Uses ApiConfigSection for credential input
 * - Requires successful connection test before saving
 * - Saves credentials and closes on success
 */

import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon } from '@hugeicons/core-free-icons';
import { ApiConfigSection } from './settings/ApiConfigSection';
import { useTestConnection } from '@/hooks/useTestConnection';
import { useSettingsStore, type ApiConfig } from '@/stores/settings';

interface SetupModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close (after successful setup) */
  onSetupComplete: () => void;
}

export function SetupModal({ isOpen, onSetupComplete }: SetupModalProps) {
  const { updateApi } = useSettingsStore();
  const { test, status, error, reset } = useTestConnection();

  // Local state for the API configuration
  const [localApi, setLocalApi] = useState<ApiConfig>({
    baseUrl: '',
    consumerKey: '',
    consumerSecret: '',
  });

  // Handle connection test
  const handleTestConnection = async () => {
    const success = await test(localApi);
    return success;
  };

  // Handle save (only enabled after successful connection test)
  const handleSave = () => {
    // Save the API configuration to the store
    updateApi(localApi);
    // Signal completion to parent
    onSetupComplete();
  };

  // Check if save button should be enabled
  // Only allow save after a successful connection test
  const canSave = status === 'success';

  // Handle API config changes - reset connection status when config changes
  const handleApiChange = (newApi: ApiConfig) => {
    setLocalApi(newApi);
    // Reset connection status when credentials change
    if (status !== 'idle') {
      reset();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      // Non-closable: prevent backdrop click and hide close button
      isDismissable={false}
      hideCloseButton={true}
      // Don't allow closing via any method
      onOpenChange={() => {}}
      size="lg"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={Settings02Icon}
                className="h-6 w-6 text-primary"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Setup Required</h2>
              <p className="text-sm text-default-500 font-normal">
                Connect to your WooCommerce store to get started
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="py-2">
            <ApiConfigSection
              localApi={localApi}
              setLocalApi={handleApiChange}
              onTestConnection={handleTestConnection}
              connectionStatus={status}
              connectionError={error ?? undefined}
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            color="primary"
            onPress={handleSave}
            isDisabled={!canSave}
          >
            Save & Continue
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default SetupModal;
