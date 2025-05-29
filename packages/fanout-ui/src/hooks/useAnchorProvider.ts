import { AnchorProvider } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

export function useAnchorProvider(): AnchorProvider | undefined {
  const { connection } = useConnection();
  const { wallet, publicKey } = useWallet();
  return useMemo(() => {
    if (wallet && connection && publicKey) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return new AnchorProvider(connection, wallet.adapter, {
        commitment: "confirmed",
      });
    }
  }, [connection, wallet, publicKey]);
}
