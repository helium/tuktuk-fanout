'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import dynamic from 'next/dynamic'

const WalletMultiButtonDynamic = dynamic(
  () => Promise.resolve(WalletMultiButton),
  { ssr: false }
)

export function WalletButton() {
  return (
    <div className="flex justify-end p-4">
      <WalletMultiButtonDynamic />
    </div>
  )
} 