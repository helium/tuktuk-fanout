use anchor_lang::{prelude::*, solana_program::hash::hash};
use tuktuk_program::{
  cron::{
    cpi::{accounts::InitializeCronJobV0, initialize_cron_job_v0},
    program::Cron,
    types::InitializeCronJobArgsV0,
  },
  tuktuk::program::Tuktuk,
  TaskQueueAuthorityV0, TaskQueueV0,
};

use crate::state::{FanoutV0, GlobalStateV0};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeFanoutV0Args {
  pub name: String,
  pub schedule: String,
  pub total_shares: u32,
}

pub fn hash_name(name: &str) -> [u8; 32] {
  hash(name.as_bytes()).to_bytes()
}

#[derive(Accounts)]
#[instruction(args: InitializeFanoutV0Args)]
pub struct InitializeFanoutV0<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,
  /// CHECK: This is basically just an arg
  pub authority: AccountInfo<'info>,

  #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<FanoutV0>() + args.name.len(),
        seeds = ["fanout".as_bytes(), &hash_name(args.name.as_str())],
        bump
    )]
  pub fanout: Account<'info, FanoutV0>,

  #[account(
        has_one = task_queue,
        seeds = [b"global_state"],
        bump = global_state.bump,
    )]
  pub global_state: Account<'info, GlobalStateV0>,

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
        bump
    )]
  /// CHECK: This is a PDA that will be the authority on the task queue
  pub queue_authority: UncheckedAccount<'info>,

  #[account(mut)]
  /// CHECK: Used in CPI
  pub user_cron_jobs: AccountInfo<'info>,
  #[account(mut)]
  /// CHECK: Used in CPI
  pub cron_job: AccountInfo<'info>,
  #[account(mut)]
  /// CHECK: Used in CPI
  pub cron_job_name_mapping: AccountInfo<'info>,
  /// CHECK: Initialized in CPI
  #[account(mut)]
  pub task: AccountInfo<'info>,
  /// CHECK: Used to write return data
  #[account(mut)]
  pub task_return_account_1: AccountInfo<'info>,
  /// CHECK: Used to write return data
  #[account(mut)]
  pub task_return_account_2: AccountInfo<'info>,
  pub system_program: Program<'info, System>,
  pub tuktuk_program: Program<'info, Tuktuk>,
  pub cron_program: Program<'info, Cron>,
}

pub fn handler(ctx: Context<InitializeFanoutV0>, args: InitializeFanoutV0Args) -> Result<()> {
  ctx.accounts.fanout.set_inner(FanoutV0 {
    authority: ctx.accounts.authority.key(),
    name: args.name.clone(),
    bump: ctx.bumps.fanout,
    queue_authority_bump: ctx.bumps.queue_authority,
    cron_job: ctx.accounts.cron_job.key(),
    total_inflow: 0,
    last_snapshot_amount: ctx.accounts.fanout.get_lamports(),
    total_shares: args.total_shares,
    next_share_id: 0,
    next_cron_transaction_id: 0,
    available_cron_transaction_ids: vec![],
    total_shares_issued: 0,
    num_inflows: 0,
  });

  initialize_cron_job_v0(
    CpiContext::new_with_signer(
      ctx.accounts.cron_program.to_account_info(),
      InitializeCronJobV0 {
        payer: ctx.accounts.payer.to_account_info(),
        queue_authority: ctx.accounts.queue_authority.to_account_info(),
        task_queue_authority: ctx.accounts.task_queue_authority.to_account_info(),
        authority: ctx.accounts.queue_authority.to_account_info(),
        user_cron_jobs: ctx.accounts.user_cron_jobs.to_account_info(),
        cron_job: ctx.accounts.cron_job.to_account_info(),
        cron_job_name_mapping: ctx.accounts.cron_job_name_mapping.to_account_info(),
        task_queue: ctx.accounts.task_queue.to_account_info(),
        task: ctx.accounts.task.to_account_info(),
        task_return_account_1: ctx.accounts.task_return_account_1.to_account_info(),
        task_return_account_2: ctx.accounts.task_return_account_2.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        tuktuk_program: ctx.accounts.tuktuk_program.to_account_info(),
      },
      &[&[b"queue_authority", &[ctx.bumps.queue_authority]]],
    ),
    InitializeCronJobArgsV0 {
      name: args.name,
      schedule: args.schedule,
      free_tasks_per_transaction: 0,
      num_tasks_per_queue_call: 5,
    },
  )?;

  Ok(())
}
