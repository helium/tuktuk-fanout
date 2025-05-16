"use client";

import { IdlAccounts } from '@coral-xyz/anchor';
import { WalletFanout } from '@helium/fanout-idls/lib/types/wallet_fanout';
import { PublicKey } from '@solana/web3.js';

interface WalletShareItemProps {
  share: {
    info?: IdlAccounts<WalletFanout>['walletShareV0']
    publicKey: PublicKey
  }
  editingIndex: number | null
  editWallet: string
  editShares: string
  loading: boolean
  onEdit: (share: { info?: IdlAccounts<WalletFanout>['walletShareV0']; publicKey: PublicKey }) => void
  onRemove: (index: number) => void
  onUpdate: (e: React.FormEvent) => void
  onEditWalletChange: (value: string) => void
  onEditSharesChange: (value: string) => void
  onCancelEdit: () => void
}

export function WalletShareItem({
  share,
  editingIndex,
  editWallet,
  editShares,
  loading,
  onEdit,
  onRemove,
  onUpdate,
  onEditWalletChange,
  onEditSharesChange,
  onCancelEdit
}: WalletShareItemProps) {
  const { info } = share

  if (!info) return null

  const isEditing = editingIndex === info.id

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-4">
      <div className="flex justify-between items-start">
        {isEditing ? (
          <form onSubmit={onUpdate} className="flex-1 space-y-2" name="wallet-share-form">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Wallet Address
              </label>
              <input
                type="text"
                value={editWallet}
                onChange={(e) => onEditWalletChange(e.target.value)}
                className="w-full bg-gray-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Shares
              </label>
              <input
                type="number"
                value={editShares}
                onChange={(e) => onEditSharesChange(e.target.value)}
                className="w-full bg-gray-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 cursor-pointer"
              >
                {loading ? "Updating..." : "Update"}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="bg-gray-600 hover:bg-gray-500 text-white rounded-lg px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <div className="text-white font-medium">
                {info.wallet.toString()}
              </div>
              <div className="text-gray-400">Shares: {info.shares}</div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(share)}
                className="text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => onRemove(info.id)}
                disabled={loading}
                className="text-red-400 hover:text-red-300 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Loading..." : "Remove"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
