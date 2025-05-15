import { useAnchorAccount } from '@helium/helium-react-hooks'
import { Cron } from '@helium/tuktuk-idls/lib/types/cron'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

export const useCronJob = (cronJobKey: PublicKey | undefined) => {
  const ret = useAnchorAccount<Cron, 'cronJobV0'>(cronJobKey, 'cronJobV0')
  return {
    ...ret,
    funding: ret.account ? (ret.account.lamports / LAMPORTS_PER_SOL) - 0.00270744 : 0,
  }
}
