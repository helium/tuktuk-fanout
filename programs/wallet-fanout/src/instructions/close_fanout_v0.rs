use anchor_lang::prelude::*;
use tuktuk_program::cron::{
  accounts::CronJobV0,
  cpi::{accounts::CloseCronJobV0, close_cron_job_v0},
  program::Cron,
};

use crate::{queue_authority_seeds, state::FanoutV0};

#[derive(Accounts)]
pub struct CloseFanoutV0<'info> {
  #[account(
        mut,
        has_one = authority,
        has_one = cron_job,
        close = authority,
        constraint = fanout.num_inflows == 0 @ crate::errors::ErrorCode::CannotCloseFanoutWithInflows
    )]
  pub fanout: Account<'info, FanoutV0>,
  pub authority: Signer<'info>,

  #[account(mut)]
  pub cron_job: Box<Account<'info, CronJobV0>>,

  #[account(
        seeds = [b"queue_authority"],
        bump = fanout.queue_authority_bump,
    )]
  /// CHECK: Used for signing
  pub queue_authority: AccountInfo<'info>,

  #[account(mut)]
  /// CHECK: Used in CPI
  pub user_cron_jobs: AccountInfo<'info>,
  #[account(mut)]
  /// CHECK: Used in CPI
  pub cron_job_name_mapping: AccountInfo<'info>,
  /// CHECK: Used in CPI
  #[account(mut)]
  pub task_return_account_1: AccountInfo<'info>,
  /// CHECK: Used in CPI
  #[account(mut)]
  pub task_return_account_2: AccountInfo<'info>,

  pub cron_program: Program<'info, Cron>,
  pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CloseFanoutV0>) -> Result<()> {
  // Close the cron job
  close_cron_job_v0(CpiContext::new_with_signer(
    ctx.accounts.cron_program.to_account_info(),
    CloseCronJobV0 {
      cron_job: ctx.accounts.cron_job.to_account_info(),
      authority: ctx.accounts.queue_authority.to_account_info(),
      rent_refund: ctx.accounts.authority.to_account_info(),
      system_program: ctx.accounts.system_program.to_account_info(),
      user_cron_jobs: ctx.accounts.user_cron_jobs.to_account_info(),
      cron_job_name_mapping: ctx.accounts.cron_job_name_mapping.to_account_info(),
      task_return_account_1: ctx.accounts.task_return_account_1.to_account_info(),
      task_return_account_2: ctx.accounts.task_return_account_2.to_account_info(),
    },
    &[queue_authority_seeds!(ctx.accounts.fanout)],
  ))?;

  Ok(())
}
