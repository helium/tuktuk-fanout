import { useAccounts } from '@helium/account-fetch-cache-hooks'
import { useAnchorProvider } from '@/hooks/useAnchorProvider'
import { batchParallelInstructionsWithPriorityFee } from '@helium/spl-utils'
import { tokenInflowKey } from '@helium/wallet-fanout-sdk'
import { Account, createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, unpackAccount } from '@solana/spl-token'
import { AccountInfo, PublicKey, TransactionInstruction } from '@solana/web3.js'
import { useMemo } from 'react'
import { useAsyncCallback } from 'react-async-hook'
import { useTokenInflows } from './useInflow'
import { type TokenInfo } from './useTokenAccounts'
import { useWalletShares } from './useWalletShares'

const parser = (
  pubkey: PublicKey,
  acct: AccountInfo<Buffer>
): Account | undefined => {
  return unpackAccount(pubkey, acct);
}

export const useCreateMissingTokenAccounts = (fanout: PublicKey | undefined, tokens: TokenInfo[] = []) => {
  const { accounts: shares } = useWalletShares(fanout)
  const inflowKeys = useMemo(() => {
    if (!fanout || !tokens) return []
    return tokens.map(token => tokenInflowKey(fanout, token.mint)[0])
  }, [fanout, tokens])

  const { accounts: inflows } = useTokenInflows(inflowKeys)


  // Get all ata keys for all shares and tokens
  const ataKeys = useMemo(() => {
    if (!fanout || !shares) return []
    const keys: PublicKey[] = []

    shares.forEach(share => {
      if (!share.info) return
      inflows?.forEach(inflow => {
        if (!inflow.info) return
        keys.push(getAssociatedTokenAddressSync(inflow.info.mint, share.info!.wallet, true))
      })
    })
    return keys
  }, [fanout, shares, inflows])

  const { accounts: atas } = useAccounts(ataKeys, parser)

  // Check if there are any missing ata accounts
  const hasMissingAtas = useMemo(() => {
    if (!atas) return false
    return atas.some(ata => !ata.info)
  }, [atas])

  const provider = useAnchorProvider()
  const { execute, loading, error } = useAsyncCallback(
    async () => {
      if (!provider) throw new Error('Provider not initialized')
      if (!fanout) throw new Error('Fanout not provided')
      if (!shares) throw new Error('No shares found')

      const instructions: TransactionInstruction[] = []

      // Create ata accounts for all shares that need them
      for (const share of shares) {
        if (!share.info) continue

        for (const inflow of inflows ?? []) {
          if (!inflow.info) continue
          const ataAddr = getAssociatedTokenAddressSync(inflow.info.mint, share.info!.wallet, true)
          const existingAta = atas?.find(a => a.publicKey.equals(ataAddr))

          if (!existingAta?.info) {
            instructions.push(createAssociatedTokenAccountInstruction(
              provider.wallet.publicKey,
              ataAddr,
              share.info!.wallet,
              inflow.info.mint,
              TOKEN_PROGRAM_ID,
            ))
          }
        }
      }

      if (instructions.length === 0) return

      await batchParallelInstructionsWithPriorityFee(provider, instructions)
    }
  )

  return {
    execute,
    loading,
    error,
    hasMissingAtas
  }
}
