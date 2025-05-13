use anchor_lang::prelude::*;

use crate::state::{FanoutV0, WalletShareV0};

#[derive(Accounts)]
pub struct CloseWalletShareV0<'info> {
  #[account(
    has_one = authority
  )]
  pub fanout: Account<'info, FanoutV0>,
  pub authority: Signer<'info>,
  #[account(
        mut,
        has_one = fanout,
        close = rent_refund,
        has_one = rent_refund,
    )]
  pub wallet_share: Account<'info, WalletShareV0>,

  /// CHECK: This is the account that will receive the rent
  #[account(mut)]
  pub rent_refund: AccountInfo<'info>,
}

pub fn handler(_ctx: Context<CloseWalletShareV0>) -> Result<()> {
  Ok(())
}
