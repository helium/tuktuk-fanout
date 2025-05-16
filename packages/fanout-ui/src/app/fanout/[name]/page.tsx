"use client";

import { CopyableAddress } from "@/components/CopyableAddress";
import { CronJobStatus } from "@/components/CronJobStatus";
import { ManageWallets } from "@/components/ManageWallets";
import { TokenAccounts } from "@/components/TokenAccounts";
import { WalletButton } from "@/components/WalletButton";
import { useCronJob } from "@/hooks/useCronJob";
import { useDeleteFanout } from "@/hooks/useDeleteFanout";
import { useFanoutByName } from "@/hooks/useFanout";
import { useTask } from "@/hooks/useTask";
import { useTokenAccounts } from "@/hooks/useTokenAccounts";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function FanoutPage() {
  const params = useParams();
  const router = useRouter();
  const decodedName = decodeURIComponent(params.name as string);
  const {
    info: fanout,
    loading,
    key: fanoutKey,
  } = useFanoutByName(decodedName);
  const {
    info: cronJob,
    loading: cronJobLoading,
    funding,
  } = useCronJob(fanout?.cronJob);
  const { info: task } = useTask(cronJob?.nextScheduleTask);
  const { tokens } = useTokenAccounts(fanoutKey);
  const {
    execute: deleteFanout,
    loading: deleteLoading,
    error: deleteError,
  } = useDeleteFanout(fanoutKey, tokens);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const nextRun = useMemo(() => {
    if (!task) return null;

    const nextRunEpochSeconds = task.trigger?.timestamp?.[0];
    if (!nextRunEpochSeconds) return null;

    const nextRunDate = new Date(
      (nextRunEpochSeconds.toNumber() + 5 * 60) * 1000
    );
    return nextRunDate;
  }, [task]);

  const handleDelete = async () => {
    try {
      await deleteFanout();
      router.push("/");
    } catch (error) {
      console.error("Failed to delete fanout:", error);
    }
  };

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
          <h1 className="text-3xl font-bold text-white">{decodedName}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-3 text-red-500 hover:text-red-400 border border-red-500 hover:border-red-400 rounded-lg transition-colors cursor-pointer"
            title="Delete Fanout"
          >
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
              className="relative top-[1px]"
            >
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
          <WalletButton />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 relative">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Delete Fanout
              </h3>
              <p className="text-gray-400">
                Are you sure you want to delete this fanout? This action cannot
                be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
            {deleteError && (
              <div className="mt-4 text-red-400 text-sm text-center">
                {deleteError.message || "Failed to delete fanout"}
              </div>
            )}
          </div>
        </div>
      )}

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
                <div className="text-sm text-gray-400">Funding</div>
                <div className="text-xl text-white">
                  {funding.toFixed(4)} SOL
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <div className="text-sm text-gray-400 mb-1">Wallet Address</div>
                {fanoutKey && (
                  <CopyableAddress address={fanoutKey.toString()} />
                )}
              </div>
              {fanoutKey && fanout?.cronJob && (
                <div>
                  <div className="text-sm text-gray-400 mb-1">
                    Transaction Funding Address
                  </div>
                  <CopyableAddress address={fanout.cronJob.toBase58()} />
                </div>
              )}
            </div>

            {/* Token Accounts */}
            <div className="mb-8">
              <TokenAccounts fanout={fanoutKey} />
            </div>

            {fanoutKey && <CronJobStatus fanoutKey={fanoutKey} />}

            <ManageWallets fanoutName={decodedName} tokens={tokens} />
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
