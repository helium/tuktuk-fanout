use anchor_lang::prelude::*;
use tuktuk_program::{
  cron::{
    accounts::CronJobV0,
    cpi::{accounts::RequeueCronTaskV0, requeue_cron_task_v0},
    program::Cron,
    types::RequeueCronTaskArgsV0,
  },
  tuktuk::program::Tuktuk,
  TaskQueueAuthorityV0, TaskQueueV0,
};

use crate::{FanoutV0, GlobalStateV0};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RequeueFanoutTaskArgsV0 {
  pub task_id: u16,
}

#[derive(Accounts)]
pub struct RequeueFanoutTaskV0<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,

  #[account(
        has_one = task_queue,
    )]
  pub global_state: Account<'info, GlobalStateV0>,

  #[account(
        has_one = cron_job,
    )]
  pub fanout: Account<'info, FanoutV0>,

  #[account(mut)]
  pub task_queue: Box<Account<'info, TaskQueueV0>>,

  #[account(
        seeds = [b"task_queue_authority", task_queue.key().as_ref(), queue_authority.key().as_ref()],
        bump = task_queue_authority.bump_seed,
        seeds::program = tuktuk_program::tuktuk::ID,
    )]
  pub task_queue_authority: Box<Account<'info, TaskQueueAuthorityV0>>,

  #[account(
        seeds = [b"queue_authority"],
        bump = fanout.queue_authority_bump,
    )]
  /// CHECK: This is a PDA that will be the authority on the task queue
  pub queue_authority: UncheckedAccount<'info>,

  #[account(
    constraint = cron_job.next_schedule_task == Pubkey::default() || payer.key() == global_state.authority
  )]
  pub cron_job: Account<'info, CronJobV0>,

  /// CHECK: Initialized in CPI
  #[account(mut)]
  pub task: AccountInfo<'info>,
  /// CHECK: Used to write return data
  #[account(mut)]
  pub task_return_account_1: AccountInfo<'info>,
  /// CHECK: Used to write return data
  #[account(mut)]
  pub task_return_account_2: AccountInfo<'info>,
  pub tuktuk_program: Program<'info, Tuktuk>,
  pub cron_program: Program<'info, Cron>,
  pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RequeueFanoutTaskV0>, args: RequeueFanoutTaskArgsV0) -> Result<()> {
  requeue_cron_task_v0(
    CpiContext::new_with_signer(
      ctx.accounts.cron_program.to_account_info(),
      RequeueCronTaskV0 {
        payer: ctx.accounts.payer.to_account_info(),
        queue_authority: ctx.accounts.queue_authority.to_account_info(),
        task_queue_authority: ctx.accounts.task_queue_authority.to_account_info(),
        task_queue: ctx.accounts.task_queue.to_account_info(),
        task: ctx.accounts.task.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        authority: ctx.accounts.queue_authority.to_account_info(),
        cron_job: ctx.accounts.cron_job.to_account_info(),
        task_return_account_1: ctx.accounts.task_return_account_1.to_account_info(),
        task_return_account_2: ctx.accounts.task_return_account_2.to_account_info(),
        tuktuk_program: ctx.accounts.tuktuk_program.to_account_info(),
      },
      &[crate::queue_authority_seeds!(ctx.accounts.fanout)],
    ),
    RequeueCronTaskArgsV0 {
      task_id: args.task_id,
    },
  )?;

  Ok(())
}
