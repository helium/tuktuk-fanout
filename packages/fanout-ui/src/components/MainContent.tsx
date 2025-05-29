"use client";

import { WalletButton } from "@/components/WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { CreateFanout } from "@/components/CreateFanout";
import { FanoutList } from "@/components/FanoutList";
import { useAuthorityFanouts } from "@/hooks/useAuthorityFanouts";
import { FanoutIllustration } from "@/components/FanoutIllustration";

export function MainContent() {
  const { publicKey } = useWallet();
  const { fanouts, loading, refresh } = useAuthorityFanouts();

  return (
    <>
      <div className="flex justify-between items-center mb-8 px-2 md:px-0">
        <h1 className="text-3xl font-bold">Tuktuk Fanout</h1>
        <WalletButton />
      </div>

      {publicKey ? (
        <div className="space-y-8">
          <div className="flex justify-center items-center">
            <FanoutIllustration />
          </div>

          <div className="bg-gray-800 md:rounded-xl md:shadow-lg rounded-none shadow-none">
            <div className="p-4 md:p-8">
              <h2 className="text-2xl font-bold mb-6">Create New Fanout</h2>
              <CreateFanout refresh={refresh} />
            </div>
          </div>

          <div className="bg-gray-800 md:rounded-xl md:shadow-lg rounded-none shadow-none">
            <div className="p-4 md:p-8">
              <h2 className="text-2xl font-bold mb-6">Your Fanouts</h2>
              <FanoutList fanouts={fanouts} loading={loading} />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center mt-20">
          <h2 className="text-2xl font-bold text-gray-300">
            Connect your wallet to continue
          </h2>
        </div>
      )}
    </>
  );
}
