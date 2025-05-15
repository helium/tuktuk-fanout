'use client'

import { useCallback } from 'react'
import { useCronJob } from '@/hooks/useCronJob'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useFundAndRequeueJob } from '@/hooks/useFundAndRequeueJob'
import { useFanout } from '@/hooks/useFanout'

export function CronJobStatus({ fanoutKey }: { fanoutKey: PublicKey }) {
  const { info: fanout } = useFanout(fanoutKey)
  const { info: cronJob, loading } = useCronJob(fanout?.cronJob)
  const { connected } = useWallet()
  const { execute: fundAndRequeueJob, loading: isFunding } = useFundAndRequeueJob(fanoutKey)

  const handleRequeue = useCallback(async () => {
    if (!connected) return
    await fundAndRequeueJob()
  }, [connected, fundAndRequeueJob])

  if (loading || !cronJob?.nextScheduleTask?.equals(PublicKey.default)) {
    return null
  }

  return (
    <div className="mb-8">
      <p className="text-red-400 text-sm mb-2">Status: Removed from queue</p>
      <button 
        onClick={handleRequeue}
        disabled={!connected || isFunding}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
      >
        {isFunding ? 'Funding...' : 'Fund & Requeue Job'}
      </button>
    </div>
  )
} 