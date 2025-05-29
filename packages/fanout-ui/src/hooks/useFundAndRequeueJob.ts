import { PROGRAM_ID as CRON_PROGRAM_ID } from '@helium/cron-sdk'
import { useAnchorProvider } from '@/hooks/useAnchorProvider'
import { batchParallelInstructionsWithPriorityFee } from '@helium/spl-utils'
import { nextAvailableTaskIds, taskKey } from '@helium/tuktuk-sdk'
import { globalStateKey, init } from '@helium/wallet-fanout-sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import { useAsyncCallback } from 'react-async-hook'
import { useCronJob } from './useCronJob'
import { useFanout } from './useFanout'
import { useTaskQueue } from './useTaskQueue'
import { INITIAL_FUNDING } from './useCreateFanout'

export function useFundAndRequeueJob(fanoutKey: PublicKey) {
  const provider = useAnchorProvider()
  const { info: fanout } = useFanout(fanoutKey)
  const { publicKey } = useWallet()
  const { info: cronJob } = useCronJob(fanout?.cronJob)
  const { info: taskQueue } = useTaskQueue(cronJob?.taskQueue)

  return useAsyncCallback(async () => {
    if (!provider) throw new Error('Provider not found')
    if (!publicKey) throw new Error('Wallet not connected')
    if (!taskQueue) throw new Error('Task queue not found')
    if (!cronJob) throw new Error('Cron job not found')
    if (!fanout) throw new Error('Fanout not found')
    const fanoutProgram = await init(provider)
    const nextTask = nextAvailableTaskIds(taskQueue.taskBitmap, 1)[0]

    await batchParallelInstructionsWithPriorityFee(provider, [
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: fanout.cronJob,
        lamports: INITIAL_FUNDING * LAMPORTS_PER_SOL,
      }),
      await fanoutProgram.methods.requeueFanoutTaskV0({
        taskId: nextTask,
      }).accounts({
        taskReturnAccount1: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_1"), fanout.cronJob.toBuffer()], CRON_PROGRAM_ID)[0],
        taskReturnAccount2: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_2"), fanout.cronJob.toBuffer()], CRON_PROGRAM_ID)[0],
        task: taskKey(cronJob?.taskQueue, nextTask)[0],
        fanout: fanoutKey,
        globalState: globalStateKey()[0],
      }).instruction(),
    ])
  })
}
