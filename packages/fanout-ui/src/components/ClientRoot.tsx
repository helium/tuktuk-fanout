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
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </WalletProviderDynamic>
    </div>
  )
} 