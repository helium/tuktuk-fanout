import { PROGRAM_ID as CRON_PROGRAM_ID, cronJobTransactionKey } from '@helium/cron-sdk'
import { useAnchorProvider } from '@helium/helium-react-hooks'
import { batchInstructionsToTxsWithPriorityFee, bulkSendTransactions } from '@helium/spl-utils'
import { init as initFanout, queueAuthorityKey } from '@helium/wallet-fanout-sdk'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { useAsyncCallback } from 'react-async-hook'
import { useFanout } from './useFanout'
import { useTokenInflows, useInflowKeys } from './useInflow'
import { type TokenInfo } from './useTokenAccounts'
import { useVouchers, useVoucherKeys } from './useVoucher'
import { useWalletShares } from './useWalletShares'
import { useMemo } from 'react'
import { BN } from '@coral-xyz/anchor'

export const useClaimAll = (fanout: PublicKey | undefined, tokens: TokenInfo[] = []) => {
  const { info: fanoutInfo } = useFanout(fanout)
  const { accounts: shares } = useWalletShares(fanout)
  const inflowKeys = useInflowKeys(fanout, tokens)
  const { accounts: inflows } = useTokenInflows(inflowKeys)
  const voucherKeys = useVoucherKeys(fanout, shares, inflows)
  const { accounts: vouchers } = useVouchers(voucherKeys)

  const needsClaim = useMemo(() => {
    if (!vouchers || !inflows) return false
    return vouchers.some(voucher => {
      if (!voucher.info?.mint || !voucher.info.lastClaimedInflow) return false
      const matchingInflow = inflows.find(i => i.info?.mint.equals(voucher.info!.mint))
      if (!matchingInflow?.info?.totalInflow) return false
      const matchingToken = tokens.find(t => t.mint.equals(voucher.info!.mint))
      if (!matchingToken) return false
      return voucher.info.lastClaimedInflow.lt(matchingInflow.info.totalInflow) || matchingInflow.info.lastSnapshotAmount.lt(matchingToken.balance)
    })
  }, [vouchers, inflows, tokens])

  const provider = useAnchorProvider()
  const { execute, loading, error } = useAsyncCallback(
    async () => {
      if (!provider) throw new Error('Provider not initialized')
      if (!fanoutInfo) throw new Error('Fanout not found')
      if (!fanout) throw new Error('Fanout not provided')
      if (!vouchers) throw new Error('No vouchers found')
      if (!inflows) throw new Error('No inflows found')

      const program = await initFanout(provider)
      const instructions: TransactionInstruction[] = []

      for (const voucher of vouchers) {
        if (!voucher.info) continue
        const matchingInflow = inflows.find(i => i.info?.mint.equals(voucher.info!.mint))
        if (!matchingInflow?.info) continue

        const matchingToken = tokens.find(t => t.mint.equals(voucher.info!.mint))
        if (voucher.info.lastClaimedInflow.lt(matchingInflow.info.totalInflow) || matchingInflow.info.lastSnapshotAmount.lt(matchingToken?.balance || new BN(0))) {
          instructions.push(await program.methods.claimV0().accountsStrict({
            cronJobTransaction: cronJobTransactionKey(fanoutInfo.cronJob, voucher.info.cronTransactionId)[0],
            mint: voucher.info.mint,
            walletShare: voucher.info.walletShare,
            fanout: fanout,
            voucher: voucher.publicKey,
            cronJob: fanoutInfo.cronJob,
            tokenInflow: matchingInflow.publicKey,
            fanoutTokenAccount: getAssociatedTokenAddressSync(voucher.info.mint, fanout, true),
            tokenProgram: TOKEN_PROGRAM_ID,
            cronProgram: CRON_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            queueAuthority: queueAuthorityKey()[0],
            wallet: voucher.info.wallet,
            receiverTokenAccount: getAssociatedTokenAddressSync(voucher.info.mint, voucher.info.wallet, true)
          }).instruction())
        }
      }

      if (instructions.length === 0) return

      const txs = await batchInstructionsToTxsWithPriorityFee(provider, instructions)
      for (const tx of txs) {
        await bulkSendTransactions(provider, [tx])
      }
    }
  )

  return {
    execute,
    loading,
    error,
    needsClaim
  }
}
