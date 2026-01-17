// app/providers.tsx
'use client'

import { HeroUIProvider } from "@heroui/react"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {useRouter} from "next/navigation";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { GlobalShortcutsProvider } from '@/components/global-shortcuts-provider'
import { ThermalPrint } from '@/components/print'
import { SetupGuard } from './components/setup-guard'


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
        </SetupGuard>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </HeroUIProvider>
  )
}