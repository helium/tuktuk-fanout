use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use tuktuk_program::cron::{
  accounts::CronJobV0,
  cpi::{accounts::RemoveCronTransactionV0, remove_cron_transaction_v0},
  program::Cron,
  types::RemoveCronTransactionArgsV0,
};

use crate::{
  queue_authority_seeds,
  resize_to_fit::resize_to_fit,
  state::{FanoutV0, TokenInflowV0, VoucherV0},
};

#[derive(Accounts)]
pub struct CloseVoucherV0<'info> {
  #[account(
        mut,
        has_one = authority,
        has_one = cron_job,
    )]
  pub fanout: Account<'info, FanoutV0>,
  pub authority: Signer<'info>,

  #[account(mut)]
  pub token_inflow: Account<'info, TokenInflowV0>,
  #[account(
    associated_token::mint = token_inflow.mint,
    associated_token::authority = fanout,
  )]
  pub fanout_token_account: Account<'info, TokenAccount>,
  #[account(
        mut,
        close = rent_refund,
        has_one = rent_refund,
        has_one = fanout,
        has_one = wallet_share,
    )]
  pub voucher: Account<'info, VoucherV0>,
  // Ensure the wallet share is closed
  #[account(
    constraint = wallet_share.data_is_empty(),
  )]
  /// CHECK: By constraint and has_one
  pub wallet_share: AccountInfo<'info>,

  /// CHECK: This is the account that will receive the rent
  #[account(mut)]
  pub rent_refund: AccountInfo<'info>,

  #[account(mut)]
  pub cron_job: Box<Account<'info, CronJobV0>>,

  #[account(
        mut,
        seeds = [b"cron_job_transaction", cron_job.key().as_ref(), &voucher.cron_transaction_id.to_le_bytes()[..]],
        bump,
        seeds::program = tuktuk_program::cron::ID,
    )]
  /// CHECK: Removed in CPI
  pub cron_job_transaction: AccountInfo<'info>,

  #[account(
        seeds = [b"queue_authority"],
        bump = fanout.queue_authority_bump,
    )]
  /// CHECK: Used for signing
  pub queue_authority: AccountInfo<'info>,

  #[account(mut)]
  pub payer: Signer<'info>,
  pub system_program: Program<'info, System>,
  pub cron_program: Program<'info, Cron>,
}

pub fn handler(ctx: Context<CloseVoucherV0>) -> Result<()> {
  ctx.accounts.token_inflow.update_total_inflow(
    ctx.accounts.fanout_token_account.amount,
    &ctx.accounts.fanout,
  );

  require_eq!(
    ctx.accounts.token_inflow.total_inflow,
    ctx.accounts.voucher.last_claimed_inflow,
    crate::errors::ErrorCode::RewardsNotClaimed
  );

  // Decrement voucher count
  ctx.accounts.token_inflow.num_vouchers = ctx
    .accounts
    .token_inflow
    .num_vouchers
    .checked_sub(1)
    .unwrap();
  // Remove cron transaction
  remove_cron_transaction_v0(
    CpiContext::new_with_signer(
      ctx.accounts.cron_program.to_account_info(),
      RemoveCronTransactionV0 {
        cron_job: ctx.accounts.cron_job.to_account_info(),
        cron_job_transaction: ctx.accounts.cron_job_transaction.to_account_info(),
        authority: ctx.accounts.queue_authority.to_account_info(),
        rent_refund: ctx.accounts.rent_refund.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
      },
      &[queue_authority_seeds!(ctx.accounts.fanout)],
    ),
    RemoveCronTransactionArgsV0 {
      index: ctx.accounts.voucher.cron_transaction_id,
    },
  )?;

  // Return the cron transaction index
  ctx
    .accounts
    .fanout
    .return_cron_transaction_id_to_pool(ctx.accounts.voucher.cron_transaction_id);

  // Resize fanout account to fit updated available_cron_transaction_ides
  resize_to_fit(
    &ctx.accounts.payer.to_account_info(),
    &ctx.accounts.system_program.to_account_info(),
    &ctx.accounts.fanout,
  )?;

  Ok(())
}
