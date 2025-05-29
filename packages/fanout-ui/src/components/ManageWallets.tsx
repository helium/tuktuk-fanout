'use client'

import { useState } from 'react'
import { useWalletShares } from '@/hooks/useWalletShares'
import { useUpdateWallet, useRemoveWallet } from '@/hooks/useUpdateWalletShares'
import { useFanout, useFanoutKeyForName } from '@/hooks/useFanout'
import { WalletShareItem } from './WalletShareItem'
import { type TokenInfo } from '@/hooks/useTokenAccounts'
import { useCreateMissingVouchers } from '@/hooks/useCreateMissingVouchers'
import { useCreateMissingTokenAccounts } from '@/hooks/useCreateMissingTokenAccounts'

interface ManageWalletsProps {
  fanoutName: string
  tokens?: TokenInfo[]
}

export function ManageWallets({ fanoutName, tokens = [] }: ManageWalletsProps) {
  const fanoutKey = useFanoutKeyForName(fanoutName)
  const { info: fanout } = useFanout(fanoutKey)
  const { accounts: shares, loading: sharesLoading } = useWalletShares(fanoutKey)
  const { execute: updateWallet, loading: addLoading, error: addError } = useUpdateWallet(fanoutKey)
  const { execute: removeWallet, loading: removeLoading, error: removeError } = useRemoveWallet(fanoutKey)
  const { execute: createMissingVouchers, loading: creatingVouchers, error: createVoucherError, hasMissingVouchers } = useCreateMissingVouchers(fanoutKey, tokens)
  const { execute: createMissingTokenAccounts, loading: creatingTokenAccounts, error: createTokenAccountError, hasMissingAtas } = useCreateMissingTokenAccounts(fanoutKey, tokens)
  const [newWallet, setNewWallet] = useState('')
  const [newShares, setNewShares] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editWallet, setEditWallet] = useState('')
  const [editShares, setEditShares] = useState('')

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    const firstEmptyShare = shares?.findIndex((share) => !share.info)
    const index = firstEmptyShare && firstEmptyShare > 0 ? firstEmptyShare : fanout?.nextShareId ?? 0
    await updateWallet({ wallet: newWallet, shares: Number(newShares), index })
    setNewWallet('')
    setNewShares('')
  }

  const startEditing = (share) => {
    if (!share.info) return
    setEditingIndex(share.info.id)
    setEditWallet(share.info.wallet.toString())
    setEditShares(share.info.shares.toString())
  }

  const handleUpdateWallet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingIndex === null) return

    await updateWallet({
      wallet: editWallet,
      shares: Number(editShares),
      index: editingIndex
    })

    setEditingIndex(null)
    setEditWallet('')
    setEditShares('')
  }

  const cancelEditing = () => {
    setEditingIndex(null)
    setEditWallet('')
    setEditShares('')
  }

  if (sharesLoading) {
    return <div className="text-gray-400">Loading wallet shares...</div>
  }

  const error = addError || removeError || createVoucherError || createTokenAccountError
  const loading = addLoading || removeLoading

  return (
    <div className="space-y-8">
      <div className="bg-gray-700 md:rounded-lg md:m-4">
        <div className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Wallet Shares</h2>
            <div className="flex gap-4">
              {hasMissingVouchers && (
                <button
                  onClick={createMissingVouchers}
                  disabled={creatingVouchers}
                  className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50 cursor-pointer"
                >
                  {creatingVouchers ? "Creating Missing Vouchers..." : "Create Missing Vouchers"}
                </button>
              )}
              {hasMissingAtas && (
                <button
                  onClick={createMissingTokenAccounts}
                  disabled={creatingTokenAccounts}
                  className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50 cursor-pointer"
                >
                  {creatingTokenAccounts ? "Creating Missing Token Accounts..." : "Create Missing Token Accounts"}
                </button>
              )}
            </div>
          </div>
          {error && <div className="text-red-500 mb-4">{error.message}</div>}
          <div className="space-y-4">
            {shares?.filter((share) => share.info).map((share) => (
              <WalletShareItem
                key={share.info!.id}
                share={share}
                editingIndex={editingIndex}
                editWallet={editWallet}
                editShares={editShares}
                loading={loading}
                onEdit={startEditing}
                onRemove={removeWallet}
                onUpdate={handleUpdateWallet}
                onEditWalletChange={(value) => setEditWallet(value)}
                onEditSharesChange={(value) => setEditShares(value)}
                onCancelEdit={cancelEditing}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-700 md:rounded-lg md:m-4">
        <div className="p-4 md:p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Add New Wallet Share</h2>
          <form onSubmit={handleAddWallet} className="space-y-4" name="wallet-share-form">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Wallet Address
              </label>
              <input
                type="text"
                name="wallet-address-input"
                value={newWallet}
                onChange={(e) => setNewWallet(e.target.value)}
                className="w-full bg-gray-800 rounded-lg p-2 text-white"
                placeholder="Enter wallet address"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Shares
              </label>
              <input
                type="number"
                name="wallet-shares-input"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                className="w-full bg-gray-800 rounded-lg p-2 text-white"
                placeholder="Enter number of shares"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newWallet || !newShares}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg py-2 cursor-pointer"
            >
              {loading ? "Adding..." : "Add Wallet"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 