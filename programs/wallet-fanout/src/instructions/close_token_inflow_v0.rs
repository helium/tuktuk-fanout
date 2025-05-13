use anchor_lang::prelude::*;
use anchor_spl::{
  associated_token::AssociatedToken,
  token::{self, Mint, Token, TokenAccount},
};

use crate::{
  fanout_seeds,
  state::{FanoutV0, TokenInflowV0},
};

#[derive(Accounts)]
pub struct CloseTokenInflowV0<'info> {
  #[account(
    mut,
    has_one = authority
  )]
  pub fanout: Account<'info, FanoutV0>,
  #[account(mut)]
  pub authority: Signer<'info>,

  #[account(
        mut,
        close = rent_refund,
        has_one = rent_refund,
        has_one = mint,
        constraint = token_inflow.num_vouchers == 0,
    )]
  pub token_inflow: Account<'info, TokenInflowV0>,
  pub mint: Account<'info, Mint>,

  #[account(
    mut,
    associated_token::mint = mint,
    associated_token::authority = fanout,
  )]
  pub fanout_token_account: Account<'info, TokenAccount>,

  #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
  pub authority_token_account: Account<'info, TokenAccount>,

  /// CHECK: This is the account that will receive the rent
  #[account(mut)]
  pub rent_refund: AccountInfo<'info>,

  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseTokenInflowV0>) -> Result<()> {
  // Transfer remaining tokens to authority
  if ctx.accounts.fanout_token_account.amount > 0 {
    token::transfer(
      CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
          from: ctx.accounts.fanout_token_account.to_account_info(),
          to: ctx.accounts.authority_token_account.to_account_info(),
          authority: ctx.accounts.fanout.to_account_info(),
        },
        &[fanout_seeds!(ctx.accounts.fanout)],
      ),
      ctx.accounts.fanout_token_account.amount,
    )?;
  }

  // Close the token account
  token::close_account(CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    token::CloseAccount {
      account: ctx.accounts.fanout_token_account.to_account_info(),
      destination: ctx.accounts.rent_refund.to_account_info(),
      authority: ctx.accounts.fanout.to_account_info(),
    },
    &[fanout_seeds!(ctx.accounts.fanout)],
  ))?;

  Ok(())
}
