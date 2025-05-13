import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { fanoutResolvers } from "./resolvers";
import { WalletFanout } from "@helium/fanout-idls/lib/types/wallet_fanout";
import { fetchBackwardsCompatibleIdl } from "@helium/spl-utils";
export async function init(
  provider: AnchorProvider,
  programId: PublicKey = PROGRAM_ID,
  idl?: Idl | null
): Promise<Program<WalletFanout>> {
  if (!idl) {
    idl = await fetchBackwardsCompatibleIdl(programId, provider);
  }
  const program = new Program<WalletFanout>(
    idl as WalletFanout,
    provider,
    undefined,
    () => {
      return fanoutResolvers;
    }
  ) as Program<WalletFanout>;

  return program;
}

export * from "./constants";
export * from "./pdas";
export * from "./resolvers";
