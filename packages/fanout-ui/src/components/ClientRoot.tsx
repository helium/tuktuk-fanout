'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

const WalletProviderDynamic = dynamic(
  () => import('./WalletProvider').then(mod => mod.WalletProvider),
  { 
    ssr: false,
    loading: () => <div>Loading wallet...</div>
  }
)

export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <WalletProviderDynamic>
        <div className="md:max-w-7xl md:mx-auto md:px-6 p-0 w-full">
          {children}
        </div>
      </WalletProviderDynamic>
    </div>
  )
} 