"use client";

import { TokenInfo, useTokenAccounts } from "@/hooks/useTokenAccounts";
import {
  getMetadata,
  getMetadataId,
  METADATA_PARSER,
  useMetaplexMetadata,
} from "@/hooks/useMetaplexMetadata";
import Image from "next/image";
import { AccountInfo, PublicKey } from "@solana/web3.js";
import { useCreateVouchers } from "@/hooks/useCreateVouchers";
import { useAnchorAccount } from "@helium/helium-react-hooks";
import { WalletFanout } from "@helium/fanout-idls/lib/types/wallet_fanout";
import { tokenInflowKey } from "@helium/wallet-fanout-sdk";
import { IdlAccounts } from "@coral-xyz/anchor";
import { useClaimAll } from "@/hooks/useClaimAll";
import {
  humanReadable,
  sendInstructionsWithPriorityFee,
} from "@helium/spl-utils";
import { BN } from "bn.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useMemo } from "react";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useAsync, useAsyncCallback } from "react-async-hook";
import { useAccounts } from "@helium/account-fetch-cache-hooks";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { useFanout } from "@/hooks/useFanout";
import { useAnchorProvider } from "@/hooks/useAnchorProvider";

function isValidUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export interface TokenAccountCardProps {
  mint: PublicKey;
  balance: InstanceType<typeof BN>;
  decimals: number;
  fanout: PublicKey;
  inflow?: IdlAccounts<WalletFanout>["tokenInflowV0"];
  voucher?: IdlAccounts<WalletFanout>["voucherV0"];
}

export function TokenAccountCard({
  mint,
  balance,
  decimals,
  fanout,
  inflow: existingInflow,
}: TokenAccountCardProps) {
  const {
    metadata,
    json,
    loading: metadataLoading,
  } = useMetaplexMetadata(mint);
  const { info: fanoutInfo } = useFanout(fanout);
  const {
    execute: createVouchers,
    loading: creatingVoucher,
    error: createVoucherError,
  } = useCreateVouchers(fanout);
  const tokenInflowAddress = tokenInflowKey(fanout, mint)[0];
  const { info: tokenInflow, loading: inflowLoading } = useAnchorAccount<
    WalletFanout,
    "tokenInflowV0"
  >(tokenInflowAddress, "tokenInflowV0");
  const loading = metadataLoading || inflowLoading;

  if (loading) {
    return (
      <div className="bg-gray-700 p-4 rounded-lg animate-pulse">
        <div className="h-12 w-12 bg-gray-600 rounded-full mb-4"></div>
        <div className="h-4 w-24 bg-gray-600 rounded mb-2"></div>
        <div className="h-4 w-16 bg-gray-600 rounded"></div>
      </div>
    );
  }

  const tokenName = json?.name || metadata?.data?.name || "Unknown Token";
  const tokenSymbol = json?.symbol || metadata?.data?.symbol || "???";
  const rawImageUrl = (json?.image || metadata?.data?.uri || "").trim();
  const imageUrl = isValidUrl(rawImageUrl) ? rawImageUrl : "";
  const formattedBalance = humanReadable(balance, decimals);

  const handleEnableFanout = async () => {
    await createVouchers({ mint });
  };

  return (
    <div className="flex flex-col bg-gray-700 p-4 rounded-lg">
      {createVoucherError && (
        <div className="text-red-400 text-sm mb-3">
          {createVoucherError.message}
        </div>
      )}
      <div className="flex items-start gap-4">
        {imageUrl && isValidUrl(imageUrl) ? (
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
            <h3 className="text-lg font-medium text-white truncate">
              {tokenName}
            </h3>
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
          disabled={creatingVoucher || fanoutInfo?.totalSharesIssued === 0}
          className="w-full mt-4 px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm cursor-pointer"
        >
          {creatingVoucher
            ? "Enabling..."
            : fanoutInfo?.totalSharesIssued === 0
            ? "Add shares to Enable"
            : "Enable Fanout"}
        </button>
      )}
    </div>
  );
}

// Helper component to render token option with metadata
function TokenOption({
  mint,
  onSelect,
  selected,
  name,
  symbol,
  image,
}: {
  mint: PublicKey;
  onSelect: (mint: PublicKey, name: string, symbol: string) => void;
  selected: boolean;
  name: string;
  symbol: string;
  image: string;
}) {
  return (
    <div
      className={`px-3 py-2 cursor-pointer hover:bg-gray-600 ${
        selected ? "bg-gray-600" : ""
      }`}
      onClick={() => onSelect(mint, name, symbol)}
    >
      <div className="flex items-center gap-2 mb-1">
        {image && isValidUrl(image) ? (
          <div className="relative h-4 w-4 rounded-full overflow-hidden flex-shrink-0">
            <Image src={image} alt={name} fill className="object-cover" />
          </div>
        ) : null}
        <span className="font-medium text-white truncate">
          {name || mint.toBase58().slice(0, 6)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {symbol && <span>{symbol}</span>}
        <span className="truncate">
          {mint.toBase58().slice(0, 6)}...{mint.toBase58().slice(-4)}
        </span>
      </div>
    </div>
  );
}

function isValidPublicKey(mint: unknown): mint is PublicKey {
  return mint instanceof PublicKey;
}

export function TokenAccounts({
  fanout,
  refresh,
  tokens,
  loading,
}: {
  fanout?: PublicKey;
  refresh: () => void;
  tokens: TokenInfo[];
  loading: boolean;
}) {
  const {
    execute: claimAll,
    loading: claimLoading,
    error: claimError,
    needsClaim,
  } = useClaimAll(fanout, tokens);
  const { publicKey } = useWallet();
  const walletTokens = useTokenAccounts(publicKey ?? undefined).tokens;
  const [modalOpen, setModalOpen] = useState(false);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<{
    mint: PublicKey;
    name?: string;
    symbol?: string;
  } | null>(null);
  const provider = useAnchorProvider();

  const optionsRaw = walletTokens;
  const options = useMemo(
    () => optionsRaw.filter((opt) => opt.decimals > 0),
    [optionsRaw]
  );
  const metadataKeys = useMemo(
    () => options.map((opt) => getMetadataId(opt.mint)),
    [options]
  );
  const { accounts: metadatas } = useAccounts(metadataKeys, METADATA_PARSER);

  const { result: optionsWithMetadata } = useAsync(async () => {
    if (!metadatas) return undefined;
    // In batches of 10, get metadata for each token
    const batches: {
      account?: AccountInfo<Buffer<ArrayBufferLike>>;
      info?: Metadata;
      publicKey: PublicKey;
    }[][] = [];
    for (let i = 0; i < metadatas?.length; i += 10) {
      batches.push(metadatas.slice(i, i + 10));
    }
    const ret: {
      symbol: string;
      name: string;
      image: string;
      info: TokenInfo;
    }[] = [];
    let currBatch = 0;
    for (const batch of batches) {
      const metadatas = await Promise.all(
        batch.map((opt) => getMetadata(opt.info?.data?.uri))
      );
      ret.push(
        ...metadatas.map((metadata, i) => ({
          info: options[i + currBatch * 10],
          symbol: metadata?.symbol || batch[i].info?.data?.symbol,
          name: metadata?.name || batch[i].info?.data?.name,
          image: metadata?.image || batch[i].info?.data?.uri,
        }))
      );
      currBatch++;
    }
    return ret;
  }, [metadatas, options]);

  const filteredOptions = useMemo(() => {
    const q = input.toLowerCase();
    return optionsWithMetadata?.filter((opt) => {
      if (!opt.info) return false;
      return (
        opt.info.mint.toBase58().toLowerCase().includes(q) ||
        opt.name?.toLowerCase().includes(q) ||
        opt.symbol?.toLowerCase().includes(q)
      );
    });
  }, [input, optionsWithMetadata]);

  const {
    execute: handleCreate,
    loading: creating,
    error: createError,
  } = useAsyncCallback(async () => {
    let mint: PublicKey | undefined;
    if (selected?.mint) {
      mint = selected.mint;
    } else if (input) {
      try {
        mint = new PublicKey(input);
      } catch {
        throw new Error("Invalid mint address");
      }
    }
    if (!mint || !fanout || !provider)
      throw new Error("Missing mint or fanout");
    const ata = getAssociatedTokenAddressSync(mint, fanout, true);
    const ix = createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      ata,
      fanout,
      mint,
      TOKEN_PROGRAM_ID
    );
    await sendInstructionsWithPriorityFee(provider, [ix]);

    await refresh();
    setModalOpen(false);
    setInput("");
    setSelected(null);
  });

  if (!fanout || loading) {
    return <div className="text-gray-400">Loading token accounts...</div>;
  }

  const Modal = (
    <>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-2 relative max-h-[90vh] flex flex-col">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-white"
              onClick={() => setModalOpen(false)}
            >
              &times;
            </button>
            <div className="flex-shrink-0">
              <h3 className="text-lg font-bold mb-4 text-white">
                Create Token Account
              </h3>
              <label className="block text-sm text-gray-300 mb-2">
                Mint Address or Token
              </label>
              <input
                className="w-full px-3 py-2 rounded bg-gray-700 text-white mb-2"
                placeholder="Paste mint address or search by name/symbol"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setSelected(null);
                }}
                autoFocus
              />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto mb-2">
              {filteredOptions
                ?.filter((opt) => isValidPublicKey(opt.info.mint))
                .slice(0, 10)
                .map((opt) => {
                  const mint = opt.info.mint;
                  if (!mint) return null;
                  return (
                    <TokenOption
                      key={mint.toBase58()}
                      mint={mint}
                      name={opt.name}
                      symbol={opt.symbol}
                      image={opt.image}
                      selected={
                        selected?.mint
                          ? isValidPublicKey(selected.mint) &&
                            selected.mint.equals(mint)
                          : false
                      }
                      onSelect={(mint, name, symbol) => {
                        if (isValidPublicKey(mint)) {
                          setSelected({ mint, name, symbol });
                          setInput(name + (symbol ? ` (${symbol})` : ""));
                        }
                      }}
                    />
                  );
                })}
            </div>
            {createError && (
              <div className="text-red-500 mb-2">
                {createError.message || String(createError)}
              </div>
            )}
            <button
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
              onClick={handleCreate}
              disabled={creating || (!selected && !input)}
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (!tokens.length) {
    return (
      <div className="bg-gray-700 md:rounded-lg md:m-4">
        <div className="p-4 md:p-6">
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
          <div className="text-gray-300 space-y-4 flex flex-col items-center">
            <p>
              In order to enable automatic splitting of funds, you need to first
              have a token account in this wallet.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Token Account
            </button>
            <p className="text-gray-400 text-sm">
              Note: You will need to enable the fanout for each token account
              you care about, and fanning them out incurs extra costs each
              cycle.
            </p>
          </div>
        </div>
        {Modal}
      </div>
    );
  }

  return (
    <div className="bg-gray-700 md:rounded-lg md:m-4">
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Token Accounts</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Create Token Account"
              aria-label="Create Token Account"
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {needsClaim && (
              <button
                onClick={() => claimAll()}
                disabled={claimLoading || loading}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm cursor-pointer"
              >
                {claimLoading ? "Claiming..." : "Claim All"}
              </button>
            )}
            <button
              onClick={refresh}
              className="text-gray-400 hover:text-white transition-colors"
              title="Refresh token accounts"
              disabled={loading}
            >
              <RefreshIcon className={loading ? "animate-spin" : ""} />
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
        {Modal}
      </div>
    </div>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
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
  );
}
