import { cronJobTransactionKey, PROGRAM_ID as CRON_PROGRAM_ID } from '@helium/cron-sdk'
import { useAnchorProvider } from '@helium/helium-react-hooks'
import { batchInstructionsToTxsWithPriorityFee, batchSequentialParallelInstructions, bulkSendTransactions } from '@helium/spl-utils'
import { init as initFanout, queueAuthorityKey, tokenInflowKey, voucherKey, walletShareKey } from '@helium/wallet-fanout-sdk'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { useCallback } from 'react'
import { useAsyncCallback } from 'react-async-hook'
import { useFanout } from './useFanout'
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { ASSOCIATED_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'


export const useUpdateWallet = (fanout: PublicKey | undefined) => {
  const { info: fanoutInfo } = useFanout(fanout)

  const provider = useAnchorProvider()
  return useAsyncCallback(
    useCallback(async ({ wallet, shares, index }: { wallet: string, shares: number, index: number }) => {
      if (!provider) throw new Error('Provider not initialized')
      if (!fanoutInfo) throw new Error('Fanout not found')
      if (!fanout) throw new Error('Fanout not provided')

      const program = await initFanout(provider)
      const tokenAccounts = await provider.connection.getTokenAccountsByOwner(new PublicKey(fanout), {
        programId: TOKEN_PROGRAM_ID
      })
      const inflows = tokenAccounts.value.map(account => tokenInflowKey(fanout, AccountLayout.decode(account.account.data).mint)[0])
      const inflowAccounts = await program.account.tokenInflowV0.fetchMultiple(inflows)
      const instructions: TransactionInstruction[] = []
      instructions.push(await program.methods
        .updateWalletShareV0({
          shares,
          index
        })
        .accounts({
          wallet,
          fanout: fanout
        })
        .instruction())
      // Clone the available IDs array to avoid mutating the original
      const availableIds = [...fanoutInfo.availableCronTransactionIds]
      let nextCronTransactionId = fanoutInfo.nextCronTransactionId

      const getNextCronTransactionId = () => {
        if (availableIds.length > 0) {
          return availableIds.pop()!
        } else {
          const id = nextCronTransactionId
          nextCronTransactionId++
          return id
        }
      }
      const walletShare = walletShareKey(fanout, index)[0]
      for (const inflow of inflowAccounts) {
        if (inflow) {
          instructions.push(await program.methods.initializeVoucherV0().accountsStrict({
            cronJobTransaction: cronJobTransactionKey(fanoutInfo.cronJob, getNextCronTransactionId())[0],
            mint: inflow.mint,
            walletShare: walletShare,
            fanout: fanout,
            voucher: voucherKey(fanout, inflow.mint, walletShare)[0],
            cronJob: fanoutInfo.cronJob,
            tokenInflow: tokenInflowKey(fanout, inflow.mint)[0],
            fanoutTokenAccount: getAssociatedTokenAddressSync(inflow.mint, fanout, true),
            tokenProgram: TOKEN_PROGRAM_ID,
            cronProgram: CRON_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            authority: queueAuthorityKey()[0],
            associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
            payer: provider.wallet.publicKey
          }).instruction())
        }
      }

      const txs = await batchInstructionsToTxsWithPriorityFee(provider, instructions)
      for (const tx of txs) {
        await bulkSendTransactions(provider, [tx])
      }
    }, [fanoutInfo, fanout, provider])
  )
}

export const useRemoveWallet = (fanout: PublicKey | undefined) => {
  const { info: fanoutInfo } = useFanout(fanout)
  const provider = useAnchorProvider()
  return useAsyncCallback(
    useCallback(async (index: number) => {
      if (!provider) throw new Error('Provider not initialized')
      if (!fanoutInfo) throw new Error('Fanout not found')
      if (!fanout) throw new Error('Fanout not provided')

      const program = await initFanout(provider)
      const walletSharePda = walletShareKey(fanout, index)[0]

      // Get all vouchers for this wallet share
      const voucherAccounts = await program.account.voucherV0.all([
        {
          memcmp: {
            offset: 8, // Discriminator size
            bytes: walletSharePda.toBase58()
          }
        }
      ])

      // Create close instructions for each voucher
      const voucherCloseInstructions = await Promise.all(
        voucherAccounts.map(async (voucher) =>
          program.methods
            .closeVoucherV0()
            .accounts({
              voucher: voucher.publicKey,
              cronJobTransaction: cronJobTransactionKey(fanoutInfo.cronJob, voucher.account.cronTransactionId)[0],
              tokenInflow: tokenInflowKey(fanout, voucher.account.mint)[0]
            })
            .instruction()
        )
      )

      // Create instruction to close the wallet share
      const closeWalletShareInstruction = await program.methods
        .closeWalletShareV0()
        .accounts({
          walletShare: walletSharePda,
        })
        .instruction()

      // Ensure vouchers are all closed first
      await batchSequentialParallelInstructions({
        provider,
        instructions: [[closeWalletShareInstruction], voucherCloseInstructions],
      })

    }, [fanoutInfo, fanout, provider])
  )
}
