import { IdlAccounts } from '@coral-xyz/anchor'
import { WalletFanout } from '@helium/fanout-idls/lib/types/wallet_fanout'
import { useAnchorAccount, useAnchorAccounts } from '@helium/helium-react-hooks'
import { tokenInflowKey } from '@helium/wallet-fanout-sdk'
import { PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'

export type TokenInflowV0 = IdlAccounts<WalletFanout>["tokenInflowV0"]

export const useTokenInflow = (tokenInflowKey: PublicKey | undefined) =>
  useAnchorAccount<WalletFanout, 'tokenInflowV0'>(tokenInflowKey, 'tokenInflowV0')

export const useTokenInflows = (tokenInflowKeys: PublicKey[] | undefined) =>
  useAnchorAccounts<WalletFanout, 'tokenInflowV0'>(tokenInflowKeys, 'tokenInflowV0')

export const useTokenInflowKey = ({ fanoutKey, mint }: { fanoutKey?: PublicKey, mint?: PublicKey }) => {
  return useMemo(() => {
    if (!fanoutKey || !mint) return undefined
    return tokenInflowKey(fanoutKey, mint)[0]
  }, [fanoutKey, mint])
}

export const useTokenInflowByKey = ({ fanoutKey, mint }: { fanoutKey?: PublicKey, mint?: PublicKey }) => {
  const key = useTokenInflowKey({ fanoutKey, mint })

  return {
    ...useTokenInflow(key),
    key,
  }
}