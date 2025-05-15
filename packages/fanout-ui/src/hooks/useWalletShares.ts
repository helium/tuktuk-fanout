import { WalletFanout } from '@helium/fanout-idls/lib/types/wallet_fanout'
import { walletShareKey } from "@helium/wallet-fanout-sdk"
import { PublicKey } from "@solana/web3.js"
import { useMemo } from "react"
import { useFanout } from "./useFanout"
import { useAnchorAccounts } from '@helium/helium-react-hooks'

export function useWalletShares(fanoutKey?: PublicKey) {
  const { info: fanout } = useFanout(fanoutKey)
  const walletShareIds = useMemo(() => {
    if (!fanoutKey) return []
    return Array.from(Array(fanout?.nextShareId ?? 0).keys()).map(index => walletShareKey(fanoutKey, index)[0])
  }, [fanoutKey, fanout])

  return useAnchorAccounts<WalletFanout, "walletShareV0">(
    walletShareIds,
    "walletShareV0",
  )
} 