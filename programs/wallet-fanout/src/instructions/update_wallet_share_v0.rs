use std::cmp::max;

use anchor_lang::prelude::*;

use crate::state::{FanoutV0, WalletShareV0};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateWalletShareV0Args {
  pub shares: u32,
  pub index: u32,
}

#[derive(Accounts)]
#[instruction(args: UpdateWalletShareV0Args)]
pub struct UpdateWalletShareV0<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,
  /// CHECK: This is basically just an arg
  pub authority: Signer<'info>,
  /// CHECK: This is basically just an arg
  pub wallet: AccountInfo<'info>,
  #[account(
    mut,
    has_one = authority
  )]
  pub fanout: Account<'info, FanoutV0>,

  #[account(
        init_if_needed,
        payer = payer,
        space = 8 + std::mem::size_of::<WalletShareV0>(),
        seeds = [b"wallet_share", fanout.key().as_ref(), &args.index.to_le_bytes()],
        bump
    )]
  pub wallet_share: Account<'info, WalletShareV0>,

  pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UpdateWalletShareV0>, args: UpdateWalletShareV0Args) -> Result<()> {
  let fanout = &mut ctx.accounts.fanout;
  let wallet_share = &mut ctx.accounts.wallet_share;

  fanout.total_shares_issued = fanout
    .total_shares_issued
    .checked_sub(wallet_share.shares)
    .unwrap();
  fanout.total_shares_issued = fanout.total_shares_issued.checked_add(args.shares).unwrap();

  require_gte!(
    fanout.total_shares,
    fanout.total_shares_issued,
    crate::errors::ErrorCode::TotalSharesExceeded
  );

  // Update wallet share
  wallet_share.fanout = fanout.key();
  wallet_share.id = args.index;
  wallet_share.wallet = ctx.accounts.wallet.key();
  wallet_share.shares = args.shares;
  wallet_share.rent_refund = ctx.accounts.payer.key();

  fanout.next_share_id = max(args.index + 1, fanout.next_share_id);

  Ok(())
}
