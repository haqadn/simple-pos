'use client';

/**
 * SetupGuard Component
 *
 * A wrapper component that blocks app content until API credentials are configured.
 * Displays the SetupModal when !isConfigured(), otherwise renders children normally.
 *
 * This should wrap the main app content to enforce credential configuration
 * before allowing any POS operations.
 */

import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { SetupModal } from './setup-modal';

interface SetupGuardProps {
  children: React.ReactNode;
}

export function SetupGuard({ children }: SetupGuardProps) {
  // Track whether we've completed hydration to avoid SSR mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  // Track whether setup is complete (either already configured or just completed)
  const [setupComplete, setSetupComplete] = useState(false);

  // Get isConfigured from the store
  const isConfigured = useSettingsStore((state) => state.isConfigured());

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
    // If already configured on mount, mark setup as complete
    if (isConfigured) {
      setSetupComplete(true);
    }
  }, [isConfigured]);

  // Handle setup completion from the modal
  const handleSetupComplete = () => {
    setSetupComplete(true);
  };

  // During SSR or before hydration, render nothing to avoid mismatch
  // This prevents flash of wrong content
  if (!isHydrated) {
    return null;
  }

  // If setup is not complete (not configured and not just completed), show modal
  if (!setupComplete) {
    return (
      <>
        {/* Show the setup modal */}
        <SetupModal isOpen={true} onSetupComplete={handleSetupComplete} />
        {/* Render children underneath but they'll be blocked by the modal */}
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </>
    );
  }

  // Setup is complete, render children normally
  return <>{children}</>;
}

export default SetupGuard;
