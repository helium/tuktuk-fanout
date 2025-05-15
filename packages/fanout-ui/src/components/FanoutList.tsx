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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {fanouts.map((fanout) => (
              <Link
                key={fanout.account.name}
                href={`/fanout/${fanout.account.name}`}
                className="block bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <h3 className="text-lg font-medium text-white mb-2">
                  {fanout.account.name}
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-300">
                    Total Shares: {fanout.account.totalShares}
                  </p>
                  <CopyableAddress address={fanout.publicKey.toString()} />
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