"use client";

import { CronJobStatus } from "@/components/CronJobStatus";
import { ManageWallets } from "@/components/ManageWallets";
import { WalletButton } from "@/components/WalletButton";
import { useCronJob } from "@/hooks/useCronJob";
import { useFanoutByName } from "@/hooks/useFanout";
import { useTask } from "@/hooks/useTask";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { CopyableAddress } from "@/components/CopyableAddress";
import { TokenAccounts } from "@/components/TokenAccounts";
import { useTokenAccounts } from "@/hooks/useTokenAccounts";

export default function FanoutPage() {
  const params = useParams();
  const router = useRouter();
  const { info: fanout, loading, key: fanoutKey } = useFanoutByName(params.name as string);
  const { info: cronJob, loading: cronJobLoading, funding } = useCronJob(
    fanout?.cronJob
  );
  const { info: task } = useTask(cronJob?.nextScheduleTask);
  const { tokens } = useTokenAccounts(fanoutKey)
  const nextRun = useMemo(() => {
    if (!task) return null;

    const nextRunEpochSeconds = task.trigger?.timestamp?.[0];
    if (!nextRunEpochSeconds) return null;

    const nextRunDate = new Date(
      (nextRunEpochSeconds.toNumber() + 5 * 60) * 1000
    );
    return nextRunDate;
  }, [task]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            ← Back to list
          </button>
          <h1 className="text-3xl font-bold text-white">{params.name}</h1>
        </div>
        <WalletButton />
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-400">Loading fanout details...</div>
        </div>
      ) : fanout ? (
        <div className="space-y-8">
          <div className="bg-gray-800 rounded-xl shadow-lg p-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div>
                <div className="text-sm text-gray-400">Total Shares</div>
                <div className="text-xl text-white">
                  {fanout.totalShares.toString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Schedule</div>
                {cronJobLoading ? (
                  <div className="text-xl text-white">Loading...</div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xl text-white">
                      {cronJob?.schedule}
                    </div>
                    {nextRun ? (
                      <div className="text-sm text-gray-400">
                        Next run: {nextRun?.toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">
                        No next run scheduled
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-400">Transaction Fee Funding</div>
                  <div className="group relative">
                    <div className="cursor-help text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                      </svg>
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-72 p-2 bg-gray-800 text-xs text-gray-300 rounded-lg shadow-lg">
                      Every time the fanout activates and distributes tokens, it incurs solana transaction fees. If funding falls to 0, the fanout will stop distributing tokens. If funds are running low, copy the Transaction Funding Address and send it some SOL
                    </div>
                  </div>
                </div>
                <div className="text-xl text-white">
                  {cronJobLoading ? "..." : funding.toFixed(8)} SOL
                </div>
              </div>
            </div>

            {/* Addresses Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <div className="text-sm text-gray-400 mb-1">Wallet Address</div>
                {fanoutKey && (
                  <CopyableAddress address={fanoutKey.toString()} />
                )}
              </div>
              {fanoutKey && fanout?.cronJob && (
                <div>
                  <div className="text-sm text-gray-400 mb-1">Transaction Funding Address</div>
                  <CopyableAddress address={fanout.cronJob.toBase58()} />
                </div>
              )}
            </div>

            {/* Token Accounts */}
            <div className="mb-8">
              <TokenAccounts fanout={fanoutKey} />
            </div>

            {fanoutKey && <CronJobStatus fanoutKey={fanoutKey} />}

            <ManageWallets fanoutName={params.name as string} tokens={tokens} />
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400">Fanout not found</div>
        </div>
      )}
    </div>
  );
}
