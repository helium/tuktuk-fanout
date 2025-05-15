import { useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"
import { useCallback, useEffect, useState } from "react"
import { TOKEN_PROGRAM_ID } from "@solana/spl-token"
import BN from "bn.js"

export type TokenInfo = {
  mint: PublicKey
  balance: BN
  decimals: number
  symbol: string
}

export function useTokenAccounts(owner?: PublicKey) {
  const { connection } = useConnection()
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!owner) return

    setLoading(true)
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        owner,
        { programId: TOKEN_PROGRAM_ID }
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenInfos = tokenAccounts.value.map((ta: any) => {
        const parsedInfo = ta.account.data.parsed.info
        return {
          mint: new PublicKey(parsedInfo.mint),
          balance: new BN(parsedInfo.tokenAmount.amount),
          decimals: parsedInfo.tokenAmount.decimals,
          symbol: parsedInfo.symbol || 'Unknown'
        }
      })

      setTokens(tokenInfos)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [connection, owner])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    tokens,
    loading,
    refresh
  }
} 