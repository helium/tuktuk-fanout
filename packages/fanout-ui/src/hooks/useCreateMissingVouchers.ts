import { ASSOCIATED_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  PROGRAM_ID as CRON_PROGRAM_ID,
  cronJobTransactionKey,
} from "@helium/cron-sdk";
import { useAnchorProvider } from "@helium/helium-react-hooks";
import {
  batchInstructionsToTxsWithPriorityFee,
  bulkSendTransactions,
} from "@helium/spl-utils";
import {
  init as initFanout,
  queueAuthorityKey,
  tokenInflowKey,
  voucherKey,
} from "@helium/wallet-fanout-sdk";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { useMemo } from "react";
import { useAsyncCallback } from "react-async-hook";
import { useFanout } from "./useFanout";
import { useTokenInflows, useInflowKeys } from "./useInflow";
import { type TokenInfo } from "./useTokenAccounts";
import { useVouchers, useVoucherKeys } from "./useVoucher";
import { useWalletShares } from "./useWalletShares";

export const useCreateMissingVouchers = (
  fanout: PublicKey | undefined,
  tokens: TokenInfo[] = []
) => {
  const { info: fanoutInfo } = useFanout(fanout);
  const { accounts: shares } = useWalletShares(fanout);
  const inflowKeys = useInflowKeys(fanout, tokens);
  const { accounts: inflows } = useTokenInflows(inflowKeys);
  const voucherKeys = useVoucherKeys(fanout, shares, inflows);
  const { accounts: vouchers } = useVouchers(voucherKeys);

  // Check if there are any missing vouchers
  const hasMissingVouchers = useMemo(() => {
    if (!vouchers) return false;
    return vouchers.some((voucher) => !voucher.info);
  }, [vouchers]);

  const provider = useAnchorProvider();
  const { execute, loading, error } = useAsyncCallback(async () => {
    if (!provider) throw new Error("Provider not initialized");
    if (!fanoutInfo) throw new Error("Fanout not found");
    if (!fanout) throw new Error("Fanout not provided");
    if (!shares) throw new Error("No shares found");
    if (!inflows) throw new Error("No inflows found");

    const program = await initFanout(provider);
    const instructions: TransactionInstruction[] = [];

    // Clone the available IDs array to avoid mutating the original
    const availableIds = [...fanoutInfo.availableCronTransactionIds];
    let nextCronTransactionId = fanoutInfo.nextCronTransactionId;

    const getNextCronTransactionId = () => {
      if (availableIds.length > 0) {
        return availableIds.pop()!;
      } else {
        const id = nextCronTransactionId;
        nextCronTransactionId++;
        return id;
      }
    };

    // Create vouchers for all shares that need them
    for (const share of shares) {
      if (!share.info) continue;
      const walletShare = share.publicKey;

      for (const inflow of inflows) {
        if (!inflow.info) continue;
        const voucherAddr = voucherKey(
          fanout,
          inflow.info.mint,
          walletShare
        )[0];
        const existingVoucher = vouchers?.find((v) =>
          v.publicKey.equals(voucherAddr)
        );

        if (!existingVoucher?.info) {
          instructions.push(
            await program.methods
              .initializeVoucherV0()
              .accountsStrict({
                cronJobTransaction: cronJobTransactionKey(
                  fanoutInfo.cronJob,
                  getNextCronTransactionId()
                )[0],
                mint: inflow.info.mint,
                walletShare: walletShare,
                fanout: fanout,
                voucher: voucherKey(fanout, inflow.info.mint, walletShare)[0],
                cronJob: fanoutInfo.cronJob,
                tokenInflow: tokenInflowKey(fanout, inflow.info.mint)[0],
                fanoutTokenAccount: getAssociatedTokenAddressSync(
                  inflow.info.mint,
                  fanout,
                  true
                ),
                tokenProgram: TOKEN_PROGRAM_ID,
                cronProgram: CRON_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                authority: queueAuthorityKey()[0],
                associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
                payer: provider.wallet.publicKey,
              })
              .instruction()
          );
        }
      }
    }

    if (instructions.length === 0) return;

    const txs = await batchInstructionsToTxsWithPriorityFee(
      provider,
      instructions
    );
    for (const tx of txs) {
      await bulkSendTransactions(provider, [tx]);
    }
  });

  return {
    execute,
    loading,
    error,
    hasMissingVouchers,
  };
};
