// app/providers.tsx
'use client'

import { HeroUIProvider } from "@heroui/react"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {useRouter} from "next/navigation";


export function Providers({children}: { children: React.ReactNode }) {
  const queryClient = new QueryClient()
  const router = useRouter();


  return (
    <HeroUIProvider navigate={router.push}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </HeroUIProvider>
  )
}