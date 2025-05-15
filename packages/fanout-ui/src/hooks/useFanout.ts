import { useAnchorAccount } from '@helium/helium-react-hooks'
import { PublicKey } from '@solana/web3.js'
import { WalletFanout } from '@helium/fanout-idls/lib/types/wallet_fanout'
import { IdlAccounts } from '@coral-xyz/anchor'
import { useMemo } from 'react'
import { fanoutKey } from '@helium/wallet-fanout-sdk'

export type FanoutV0 = IdlAccounts<WalletFanout>["fanoutV0"]

export const useFanout = (fanoutKey: PublicKey | undefined) =>
  useAnchorAccount<WalletFanout, 'fanoutV0'>(fanoutKey, 'fanoutV0')


export const useFanoutKeyForName = (name?: string) => {
  return useMemo(() => name ? fanoutKey(name)[0] : undefined, [name])
}

export const useFanoutByName = (name?: string) => {
  const key = useFanoutKeyForName(name)

  return {
    ...useFanout(key),
    key,
  }
}