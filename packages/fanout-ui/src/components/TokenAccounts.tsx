'use client'

import { useTokenAccounts } from '@/hooks/useTokenAccounts'
import { useMetaplexMetadata } from '@/hooks/useMetaplexMetadata'
import Image from 'next/image'
import { PublicKey } from '@solana/web3.js'
import { useCreateVouchers } from '@/hooks/useCreateVouchers'
import { useAnchorAccount } from '@helium/helium-react-hooks'
import { WalletFanout } from '@helium/fanout-idls/lib/types/wallet_fanout'
import { tokenInflowKey } from '@helium/wallet-fanout-sdk'
import { IdlAccounts } from '@coral-xyz/anchor'
import { useClaimAll } from '@/hooks/useClaimAll'
import { humanReadable } from '@helium/spl-utils'
import { BN } from 'bn.js'

function isValidUrl(urlString: string) {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export interface TokenAccountCardProps {
  mint: PublicKey
  balance: InstanceType<typeof BN>
  decimals: number
  fanout: PublicKey
  inflow?: IdlAccounts<WalletFanout>['tokenInflowV0']
  voucher?: IdlAccounts<WalletFanout>['voucherV0']
}

export function TokenAccountCard({ mint, balance, decimals, fanout, inflow: existingInflow }: TokenAccountCardProps) {
  const { metadata, json, loading: metadataLoading } = useMetaplexMetadata(mint)
  const { execute: createVouchers, loading: creatingVoucher, error: createVoucherError } = useCreateVouchers(fanout)
  const tokenInflowAddress = tokenInflowKey(fanout, mint)[0]
  const { info: tokenInflow, loading: inflowLoading } = useAnchorAccount<WalletFanout, 'tokenInflowV0'>(tokenInflowAddress, 'tokenInflowV0')
  const loading = metadataLoading || inflowLoading
  
  if (loading) {
    return (
      <div className="bg-gray-700 p-4 rounded-lg animate-pulse">
        <div className="h-12 w-12 bg-gray-600 rounded-full mb-4"></div>
        <div className="h-4 w-24 bg-gray-600 rounded mb-2"></div>
        <div className="h-4 w-16 bg-gray-600 rounded"></div>
      </div>
    )
  }

  const tokenName = json?.name || metadata?.data?.name || 'Unknown Token'
  const tokenSymbol = json?.symbol || metadata?.data?.symbol || '???'
  const rawImageUrl = (json?.image || metadata?.data?.uri || '').trim()
  const imageUrl = isValidUrl(rawImageUrl) ? rawImageUrl : ''
  const formattedBalance = humanReadable(balance, decimals)

  const handleEnableFanout = async () => {
    await createVouchers({ mint })
  }

  return (
    <div className="flex flex-col bg-gray-700 p-4 rounded-lg">
      {createVoucherError && (
        <div className="text-red-400 text-sm mb-3">
          {createVoucherError.message}
        </div>
      )}
      <div className="flex items-start gap-4">
        {imageUrl ? (
          <div className="relative h-12 w-12 rounded-full overflow-hidden">
            <Image
              src={imageUrl}
              alt={tokenName}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-12 w-12 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-gray-400 text-lg">{tokenSymbol[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-medium text-white truncate">{tokenName}</h3>
            {(existingInflow || tokenInflow) && (
              <span className="flex-shrink-0 px-2 py-0.5 bg-green-900 text-green-300 text-xs rounded-full">
                Automated
              </span>
            )}
          </div>
          <div className="text-sm text-gray-300">
            {formattedBalance} {tokenSymbol}
          </div>
        </div>
      </div>
      {!(existingInflow || tokenInflow) && (
        <button
          onClick={handleEnableFanout}
          disabled={creatingVoucher}
          className="w-full mt-4 px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm cursor-pointer"
        >
          {creatingVoucher ? 'Enabling...' : 'Enable Fanout'}
        </button>
      )}
    </div>
  )
}

export function TokenAccounts({ fanout }: { fanout?: PublicKey }) {
  const { tokens, loading, refresh } = useTokenAccounts(fanout)
  const { execute: claimAll, loading: claimLoading, error: claimError, needsClaim } = useClaimAll(fanout, tokens)

  if (!fanout || loading) {
    return <div className="text-gray-400">Loading token accounts...</div>
  }

  if (!tokens.length) {
    return (
      <div className="bg-gray-700 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Token Accounts</h2>
          <button
            onClick={refresh}
            className="text-gray-400 hover:text-white transition-colors"
            title="Refresh token accounts"
          >
            <RefreshIcon />
          </button>
        </div>
        <div className="text-gray-300 space-y-4">
          <p>
            In order to enable automatic splitting of funds, you need to first have a token account in this wallet.
          </p>
          <p>
            You can send this wallet a small number of tokens by copying the address above. Once the wallet has a token account, you can enable the automatic fanout.
          </p>
          <p className="text-gray-400 text-sm">
            Note: You will need to enable the fanout for each token account you care about, and fanning them out incurs extra costs each cycle.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Token Accounts</h2>
        <div className="flex items-center gap-4">
          {needsClaim && (
            <button
              onClick={() => claimAll()}
              disabled={claimLoading || loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm cursor-pointer"
          >
              {claimLoading ? 'Claiming...' : 'Claim All'}
            </button>
          )}
          <button
            onClick={refresh}
            className="text-gray-400 hover:text-white transition-colors"
            title="Refresh token accounts"
            disabled={loading}
          >
            <RefreshIcon className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      {claimError && (
        <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-2 rounded-lg mb-4">
          {claimError.message}
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {tokens.map((token) => (
          <TokenAccountCard
            key={token.mint.toString()}
            mint={token.mint}
            balance={token.balance}
            decimals={token.decimals}
            fanout={fanout}
          />
        ))}
      </div>
    </div>
  )
}

function RefreshIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  )
} 