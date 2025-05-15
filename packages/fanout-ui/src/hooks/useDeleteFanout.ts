'use client'

import '@/utils/bufferfill'
import { ASSOCIATED_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/utils/token'
import { PROGRAM_ID as CRON_PROGRAM_ID, cronJobNameMappingKey, cronJobTransactionKey, userCronJobsKey } from '@helium/cron-sdk'
import { useAnchorProvider } from '@helium/helium-react-hooks'
import { batchParallelInstructionsWithPriorityFee } from '@helium/spl-utils'
import { init, queueAuthorityKey, tokenInflowKey } from '@helium/wallet-fanout-sdk'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { useAsyncCallback } from 'react-async-hook'
import { useClaimAll } from './useClaimAll'
import { useFanout } from './useFanout'
import { useInflowKeys, useTokenInflows } from './useInflow'
import { TokenInfo } from './useTokenAccounts'
import { useVoucherKeys, useVouchers } from './useVoucher'
import { useWalletShares } from './useWalletShares'

export const useDeleteFanout = (fanout: PublicKey | undefined, tokens: TokenInfo[] = []) => {
  const provider = useAnchorProvider()
  const { publicKey } = useWallet()

  const { info: fanoutInfo } = useFanout(fanout)
  const { accounts: shares } = useWalletShares(fanout)
  const inflowKeys = useInflowKeys(fanout, tokens)
  const { accounts: inflows } = useTokenInflows(inflowKeys)
  const voucherKeys = useVoucherKeys(fanout, shares, inflows)
  const { accounts: vouchers } = useVouchers(voucherKeys)

  const { execute: claimAll } = useClaimAll(fanout, tokens)

  return useAsyncCallback(async () => {
    await claimAll()
    if (!provider || !publicKey) {
      throw new Error('Missing provider or wallet')
    }
    if (!fanout) {
      throw new Error('Missing fanout')
    }
    if (!shares) {
      throw new Error('Missing shares')
    }
    if (!fanoutInfo) {
      throw new Error('Missing fanout info')
    }


    const program = await init(provider)

    // First, close all wallet shares
    const shareInstructions: TransactionInstruction[] = []
    for (const share of shares) {
      if (!share.info) continue

      shareInstructions.push(
        await program.methods
          .closeWalletShareV0()
          .accountsStrict({
            walletShare: share.publicKey,
            fanout: fanout!,
            authority: publicKey,
            rentRefund: share.info.rentRefund,
          })
          .instruction()
      )
    }

    // Then, close all vouchers
    const voucherInstructions: TransactionInstruction[] = []
    for (const voucher of vouchers ?? []) {
      if (!voucher.info) continue

      voucherInstructions.push(
        await program.methods
          .closeVoucherV0()
          .accountsStrict({
            voucher: voucher.publicKey,
            cronJobTransaction: cronJobTransactionKey(fanoutInfo.cronJob, voucher.info.cronTransactionId)[0],
            tokenInflow: tokenInflowKey(fanout, voucher.info.mint)[0],
            fanout: fanout,
            cronJob: fanoutInfo.cronJob,
            queueAuthority: queueAuthorityKey()[0],
            walletShare: voucher.info.walletShare,
            fanoutTokenAccount: getAssociatedTokenAddressSync(voucher.info.mint, fanout!, true),
            cronProgram: CRON_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            authority: publicKey,
            rentRefund: voucher.info.rentRefund,
            payer: publicKey
          })
          .instruction()
      )
    }

    // Then, close all inflows
    const inflowInstructions: TransactionInstruction[] = []
    for (const inflow of inflows ?? []) {
      if (!inflow.info) continue

      inflowInstructions.push(
        await program.methods.closeTokenInflowV0().accountsStrict({
          tokenInflow: inflow.publicKey,
          fanout: fanout!,
          mint: inflow.info.mint,
          fanoutTokenAccount: getAssociatedTokenAddressSync(inflow.info.mint, fanout!, true),
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          authority: fanoutInfo.authority,
          authorityTokenAccount: getAssociatedTokenAddressSync(inflow.info.mint, fanoutInfo.authority, true),
          rentRefund: inflow.info.rentRefund,
          associatedTokenProgram: ASSOCIATED_PROGRAM_ID
        }).instruction()
      )
    }

    // Then, close the fanout itself
    const queueAuthority = queueAuthorityKey()[0]
    const fanoutInstructions: TransactionInstruction[] = []
    fanoutInstructions.push(
      await program.methods.closeFanoutV0().accounts({
        fanout: fanout!,
        userCronJobs: userCronJobsKey(queueAuthority)[0],
        cronJobNameMapping: cronJobNameMappingKey(queueAuthority, fanoutInfo.name)[0],
        taskReturnAccount1: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_1"), fanoutInfo.cronJob.toBuffer()], CRON_PROGRAM_ID)[0],
        taskReturnAccount2: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_2"), fanoutInfo.cronJob.toBuffer()], CRON_PROGRAM_ID)[0]
      }).instruction()
    )

    await batchParallelInstructionsWithPriorityFee(provider, [
      shareInstructions,
      voucherInstructions,
      inflowInstructions,
      fanoutInstructions
    ])
  })
}