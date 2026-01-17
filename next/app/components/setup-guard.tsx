'use client';

/**
 * SetupGuard Component
 *
 * A wrapper component that blocks app content until API credentials are configured.
 * Displays the SetupModal when !isConfigured(), otherwise renders children normally.
 *
 * This should wrap the main app content to enforce credential configuration
 * before allowing any POS operations.
 *
 * For E2E testing: Add ?forceSetup=true query parameter to force the modal to appear
 * regardless of env var configuration. This allows testing the fresh install flow
 * even when NEXT_PUBLIC_* env vars are set in the build.
 *
 * Note: The forceSetup flag is captured on first load and persisted in a ref to
 * survive client-side navigations (which would otherwise lose the query param).
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSettingsStore } from '@/stores/settings';
import { SetupModal } from './setup-modal';

interface SetupGuardProps {
  children: React.ReactNode;
}

/**
 * Inner component that uses useSearchParams (requires Suspense boundary)
 */
function SetupGuardInner({ children }: SetupGuardProps) {
  // Track whether we've completed hydration to avoid SSR mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  // Track whether setup is complete (either already configured or just completed)
  const [setupComplete, setSetupComplete] = useState(false);

  // Get isConfigured from the store
  const isConfigured = useSettingsStore((state) => state.isConfigured());

  // Check for ?forceSetup=true query parameter (for E2E testing)
  // Use a ref to persist the value across route changes
  const searchParams = useSearchParams();
  const forceSetupRef = useRef<boolean | null>(null);

  // Capture forceSetup on first render before any navigation happens
  if (forceSetupRef.current === null) {
    forceSetupRef.current = searchParams.get('forceSetup') === 'true';
  }

  const forceSetup = forceSetupRef.current;

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
    // If already configured on mount AND not forcing setup, mark setup as complete
    if (isConfigured && !forceSetup) {
      setSetupComplete(true);
    }
  }, [isConfigured, forceSetup]);

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

/**
 * SetupGuard wraps the inner component with Suspense boundary
 * Required because useSearchParams needs Suspense in Next.js 13+
 */
export function SetupGuard({ children }: SetupGuardProps) {
  return (
    <Suspense fallback={null}>
      <SetupGuardInner>{children}</SetupGuardInner>
    </Suspense>
  );
}

export default SetupGuard;
