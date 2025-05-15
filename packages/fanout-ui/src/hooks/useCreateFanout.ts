'use client'

import '@/utils/bufferfill'
import { PROGRAM_ID as CRON_PROGRAM_ID, cronJobKey, cronJobNameMappingKey, init as initCron, userCronJobsKey } from '@helium/cron-sdk'
import { useAnchorProvider } from '@helium/helium-react-hooks'
import { batchParallelInstructionsWithPriorityFee } from '@helium/spl-utils'
import { init as initTuktuk, nextAvailableTaskIds, taskKey } from '@helium/tuktuk-sdk'
import { fanoutKey, globalStateKey, init, queueAuthorityKey } from '@helium/wallet-fanout-sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import { useAsyncCallback } from 'react-async-hook'

export const INITIAL_FUNDING = 0.02

export const useCreateFanout = () => {
  const provider = useAnchorProvider()
  const { publicKey } = useWallet()

  const { loading, error, execute } = useAsyncCallback(async (params: {
    name: string
    totalShares: number
    schedule: string
    onSuccess?: () => void
  }) => {
    if (!provider || !publicKey) {
      throw new Error('Missing provider or wallet')
    }

    const program = await init(provider)
    const cronProgram = await initCron(provider)
    const tuktukProgram = await initTuktuk(provider)
    const globalStateK = globalStateKey()[0]
    const globalState = await program.account.globalStateV0.fetch(globalStateK)
    const taskQueue = globalState.taskQueue

    const queueAuthority = queueAuthorityKey()[0]
    const userCronJobsK = userCronJobsKey(queueAuthority)[0]
    const userCronJobs = await cronProgram.account.userCronJobsV0.fetchNullable(userCronJobsK)
    const cronJobId = userCronJobs?.nextCronJobId || 0
    const taskQueueAcc = await tuktukProgram.account.taskQueueV0.fetch(taskQueue)
    const nextTask = nextAvailableTaskIds(taskQueueAcc.taskBitmap, 1, false)[0]
    const cronJobK = cronJobKey(queueAuthority, cronJobId)[0]

    const ix = await program.methods.initializeFanoutV0({
      name: params.name,
      schedule: params.schedule,
      totalShares: params.totalShares,
    })
      .accounts({
        payer: publicKey,
        authority: publicKey,
        fanout: fanoutKey(params.name)[0],
        cronJob: cronJobK,
        userCronJobs: userCronJobsK,
        cronJobNameMapping: cronJobNameMappingKey(queueAuthority, params.name)[0],
        task: taskKey(taskQueue, nextTask)[0],
        taskReturnAccount1: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_1"), cronJobK.toBuffer()], CRON_PROGRAM_ID)[0],
        taskReturnAccount2: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_2"), cronJobK.toBuffer()], CRON_PROGRAM_ID)[0]
      })
      .instruction()

    await batchParallelInstructionsWithPriorityFee(provider, [
      ix,
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: cronJobK,
        lamports: INITIAL_FUNDING * LAMPORTS_PER_SOL,
      }),
    ]);

    if (params.onSuccess) {
      params.onSuccess()
    }
  })

  return {
    loading,
    error,
    execute
  }
}
