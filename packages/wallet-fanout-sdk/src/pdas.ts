import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { sha256 } from "js-sha256";

export function globalStateKey(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("global_state", "utf-8")],
    programId
  );
}

export function fanoutKey(name: string, programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  const hash = sha256(name);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("fanout", "utf-8"),
      Buffer.from(hash, "hex"),
    ],
    programId
  );
}

export function queueAuthorityKey(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("queue_authority", "utf-8")],
    programId
  );
}

export function walletShareKey(
  fanout: PublicKey,
  index: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("wallet_share", "utf-8"),
      fanout.toBuffer(),
      Buffer.from(new Uint32Array([index]).buffer),
    ],
    programId
  );
}

export function tokenInflowKey(
  fanout: PublicKey,
  mint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("token_inflow", "utf-8"), fanout.toBuffer(), mint.toBuffer()],
    programId
  );
}

export function voucherKey(
  fanout: PublicKey,
  mint: PublicKey,
  walletShare: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("voucher", "utf-8"),
      fanout.toBuffer(),
      mint.toBuffer(),
      walletShare.toBuffer(),
    ],
    programId
  );
}


