import { IdlAccounts } from '@coral-xyz/anchor'
import { WalletFanout } from '@helium/fanout-idls/lib/types/wallet_fanout'
import { useAnchorAccount, useAnchorAccounts } from '@helium/helium-react-hooks'
import { voucherKey } from '@helium/wallet-fanout-sdk'
import { PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'

export type VoucherV0 = IdlAccounts<WalletFanout>["voucherV0"]

export const useVoucher = (voucherKey: PublicKey | undefined) =>
  useAnchorAccount<WalletFanout, 'voucherV0'>(voucherKey, 'voucherV0')

export const useVouchers = (voucherKeys: PublicKey[] | undefined) =>
  useAnchorAccounts<WalletFanout, 'voucherV0'>(voucherKeys, 'voucherV0')

export const useVoucherKey = ({ fanoutKey, mint, walletShare }: { fanoutKey?: PublicKey, mint?: PublicKey, walletShare?: PublicKey }) => {
  return useMemo(() => {
    if (!fanoutKey || !mint || !walletShare) return undefined
    return voucherKey(fanoutKey, mint, walletShare)[0]
  }, [fanoutKey, mint, walletShare])
}

export const useVoucherByKey = ({ fanoutKey, mint, walletShare }: { fanoutKey?: PublicKey, mint?: PublicKey, walletShare?: PublicKey }) => {
  const key = useVoucherKey({ fanoutKey, mint, walletShare })

  return {
    ...useVoucher(key),
    key,
  }
}