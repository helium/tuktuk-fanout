'use client'

import '@/utils/bufferfill'
import { cronJobTransactionKey, PROGRAM_ID as CRON_PROGRAM_ID } from '@helium/cron-sdk'
import { useAnchorProvider } from '@/hooks/useAnchorProvider'
import { batchInstructionsToTxsWithPriorityFee, bulkSendTransactions } from '@helium/spl-utils'
import { init, queueAuthorityKey, tokenInflowKey, voucherKey } from '@helium/wallet-fanout-sdk'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { useAsyncCallback } from 'react-async-hook'
import { useFanout } from './useFanout'
import { useWalletShares } from './useWalletShares'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { ASSOCIATED_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'

export const useCreateVouchers = (fanoutKey: PublicKey) => {
  const provider = useAnchorProvider()
  const { publicKey } = useWallet()
  const { info: fanout } = useFanout(fanoutKey)
  const { accounts: shares } = useWalletShares(fanoutKey)

  const { loading, error, execute } = useAsyncCallback(async (params: {
    mint: PublicKey,
  }) => {
    if (!provider || !publicKey) {
      throw new Error('Missing provider or wallet')
    }

    if (!shares) {
      throw new Error('No shares found, please create a share first')
    }

    if (!fanout) {
      throw new Error('Fanout not found')
    }

    const program = await init(provider)
    const instructions: TransactionInstruction[] = []

    // Clone the available IDs array to avoid mutating the original
    const availableIds = [...fanout.availableCronTransactionIds]
    let nextCronTransactionId = fanout.nextCronTransactionId

    const getNextCronTransactionId = () => {
      if (availableIds.length > 0) {
        return availableIds.pop()!
      } else {
        const id = nextCronTransactionId
        nextCronTransactionId++
        return id
      }
    }

    for (const share of shares) {
      if (share.info) {
        const currentCronTransactionId = getNextCronTransactionId()
        instructions.push(
          await program.methods.initializeVoucherV0()
            .accountsStrict({
              cronJobTransaction: cronJobTransactionKey(fanout.cronJob, currentCronTransactionId)[0],
              mint: params.mint,
              walletShare: share.publicKey,
              fanout: fanoutKey,
              voucher: voucherKey(fanoutKey, params.mint, share.publicKey)[0],
              cronJob: fanout.cronJob,
              tokenInflow: tokenInflowKey(fanoutKey, params.mint)[0],
              fanoutTokenAccount: getAssociatedTokenAddressSync(params.mint, fanoutKey, true),
              tokenProgram: TOKEN_PROGRAM_ID,
              cronProgram: CRON_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
              authority: queueAuthorityKey()[0],
              associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
              payer: provider.wallet.publicKey
            })
            .instruction()
        )
      }
    }
    const txs = await batchInstructionsToTxsWithPriorityFee(provider, instructions)
    for (const tx of txs) {
      await bulkSendTransactions(provider, [tx])
    }
  })

  return {
    loading,
    error,
    execute
  }
}
