import { useAnchorAccount } from '@helium/helium-react-hooks'
import { Tuktuk } from '@helium/tuktuk-idls/lib/types/tuktuk'
import { PublicKey } from '@solana/web3.js'

export const useTask = (taskKey: PublicKey | undefined) =>
  useAnchorAccount<Tuktuk, 'taskV0'>(taskKey, 'taskV0')
