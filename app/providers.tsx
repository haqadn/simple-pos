// app/providers.tsx
'use client'

import { HeroUIProvider } from "@heroui/react"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {useRouter} from "next/navigation";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { GlobalShortcutsProvider } from '@/components/global-shortcuts-provider'
import { ThermalPrint } from '@/components/print'
import { SetupGuard } from './components/setup-guard'
import { SyncManager } from './components/sync-manager'
import { useServerSync } from '@/stores/orders'

function ServerSync() {
  useServerSync();
  return null;
}

export function Providers({children}: { children: React.ReactNode }) {
  const queryClient = new QueryClient()
  const router = useRouter();


  return (
    <HeroUIProvider navigate={router.push}>
      <QueryClientProvider client={queryClient}>
        <SetupGuard>
          <GlobalShortcutsProvider>
            {children}
          </GlobalShortcutsProvider>
          <ThermalPrint />
          <SyncManager />
          <ServerSync />
        </SetupGuard>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </HeroUIProvider>
  )
}