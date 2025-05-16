'use client'

import { FanoutV0 } from '@/hooks/useFanout';
import { ProgramAccount } from '@coral-xyz/anchor';
import Link from 'next/link'
import { CopyableAddress } from './CopyableAddress'

export function FanoutList({
  fanouts,
  loading,
}: {
  fanouts: ProgramAccount<FanoutV0>[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="text-gray-400">Loading fanouts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {fanouts.length > 0 ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {fanouts.map((fanout) => (
              <Link
                key={fanout.account.name}
                href={`/fanout/${encodeURIComponent(fanout.account.name)}`}
                className="cursor-pointer block bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 shadow-lg hover:shadow-blue-900/20 transition-all duration-200"
              >
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {fanout.account.name}
                  </h3>
                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Shares</span>
                      <span className="text-gray-200">{fanout.account.totalShares}</span>
                    </div>
                    <CopyableAddress address={fanout.publicKey.toString()} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-gray-400">No fanouts found</div>
        )}
      </div>
    </div>
  );
} 