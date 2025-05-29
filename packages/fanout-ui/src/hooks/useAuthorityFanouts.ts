'use client'

import { init } from '@helium/wallet-fanout-sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCallback, useEffect, useState } from 'react'
import { FanoutV0 } from './useFanout'
import { ProgramAccount } from '@coral-xyz/anchor'
import { useAnchorProvider } from './useAnchorProvider'

export function useAuthorityFanouts() {
  const provider = useAnchorProvider()
  const { publicKey } = useWallet()
  const [fanouts, setFanouts] = useState<ProgramAccount<FanoutV0>[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!publicKey || !provider) return

    const program = await init(provider)

    setLoading(true)
    try {
      const fanoutData = await program.account.fanoutV0.all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: publicKey.toBase58()
          }
        }
      ])

      setFanouts(fanoutData)
    } catch (e) {
      console.error('Failed to fetch fanouts:', e)
    } finally {
      setLoading(false)
    }
  }, [publicKey, provider])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    fanouts,
    loading,
    refresh
  }
} 