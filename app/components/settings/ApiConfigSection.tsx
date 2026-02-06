'use client';

/**
 * ApiConfigSection Component
 *
 * Shared component for WooCommerce API credential configuration.
 * Used in both the Setup Modal (first-run) and Settings Modal (updates).
 *
 * Features:
 * - URL, Consumer Key, and Consumer Secret inputs
 * - Link to WooCommerce API keys page (generated from entered URL)
 * - Optional "Test Connection" functionality with status indicators
 */

import { Button, Input, Spinner } from '@heroui/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import type { ApiConfig } from '@/stores/settings';
import type { ConnectionStatus } from '@/hooks/useTestConnection';

export interface ApiConfigSectionProps {
  /** Current API configuration state */
  localApi: ApiConfig;
  /** Callback to update API configuration */
  setLocalApi: (api: ApiConfig) => void;
  /** Optional callback to trigger connection test */
  onTestConnection?: () => Promise<boolean>;
  /** Current connection test status */
  connectionStatus?: ConnectionStatus;
  /** Error message from connection test */
  connectionError?: string;
}

/**
 * Status indicator component for connection test results
 */
function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case 'testing':
      return <Spinner size="sm" color="warning" />;
    case 'success':
      return (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          className="text-green-500 h-5 w-5"
        />
      );
    case 'error':
      return (
        <HugeiconsIcon
          icon={Cancel01Icon}
          className="text-red-500 h-5 w-5"
        />
      );
    default:
      return null;
  }
}

/**
 * Get the background color class based on connection status
 */
function getStatusBgClass(status: ConnectionStatus): string {
  switch (status) {
    case 'success':
      return 'bg-green-50';
    case 'error':
      return 'bg-red-50';
    default:
      return '';
  }
}

export function ApiConfigSection({
  localApi,
  setLocalApi,
  onTestConnection,
  connectionStatus = 'idle',
  connectionError,
}: ApiConfigSectionProps) {
  // Generate WooCommerce API keys URL from the entered base URL
  const apiKeysUrl = localApi.baseUrl
    ? `${localApi.baseUrl.replace(/\/+$/, '')}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
    : null;

  // Check if all fields are filled (required for test connection)
  const hasAllFields = Boolean(
    localApi.baseUrl && localApi.consumerKey && localApi.consumerSecret
  );

  // Determine if we should show the status area
  const showStatus = connectionStatus !== 'idle';

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Website URL"
        placeholder="https://example.com"
        value={localApi.baseUrl}
        onValueChange={(value) => setLocalApi({ ...localApi, baseUrl: value })}
        description="Your WooCommerce site URL (without /wp-json)"
      />
      <Input
        label="Consumer Key"
        placeholder="ck_..."
        value={localApi.consumerKey}
        onValueChange={(value) => setLocalApi({ ...localApi, consumerKey: value })}
      />
      <Input
        label="Consumer Secret"
        placeholder="cs_..."
        type="password"
        value={localApi.consumerSecret}
        onValueChange={(value) => setLocalApi({ ...localApi, consumerSecret: value })}
      />

      {/* WooCommerce API keys link */}
      {apiKeysUrl && (
        <p className="text-small text-default-500">
          <a
            href={apiKeysUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Manage API keys in WooCommerce
          </a>
        </p>
      )}

      {/* Test Connection section - only shown when onTestConnection is provided */}
      {onTestConnection && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-3">
            <Button
              color="secondary"
              variant="flat"
              onPress={onTestConnection}
              isDisabled={!hasAllFields || connectionStatus === 'testing'}
              isLoading={connectionStatus === 'testing'}
            >
              Test Connection
            </Button>

            {/* Status indicator */}
            {showStatus && (
              <div className="flex items-center gap-2">
                <ConnectionStatusIndicator status={connectionStatus} />
                {connectionStatus === 'success' && (
                  <span className="text-sm text-green-600 font-medium">
                    Connection successful
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Error message */}
          {connectionStatus === 'error' && connectionError && (
            <div
              className={`p-3 rounded-md ${getStatusBgClass(connectionStatus)} border border-red-200`}
            >
              <p className="text-sm text-red-600">{connectionError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ApiConfigSection;
