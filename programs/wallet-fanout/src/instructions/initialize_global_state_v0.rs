use anchor_lang::prelude::*;
use tuktuk_program::{TaskQueueAuthorityV0, TaskQueueV0};

use crate::state::GlobalStateV0;

#[derive(Accounts)]
pub struct InitializeGlobalStateV0<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,
  #[account(
        init,
        payer = payer,
        space = 8 + 60 + std::mem::size_of::<GlobalStateV0>(),
        seeds = [b"global_state"],
        bump
    )]
  pub global_state: Box<Account<'info, GlobalStateV0>>,

  #[account(
        seeds = [b"queue_authority"],
        bump
    )]
  /// CHECK: This is a PDA that will be the authority on the task queue
  pub queue_authority: UncheckedAccount<'info>,

  #[account(mut)]
  pub task_queue: Box<Account<'info, TaskQueueV0>>,

  #[account(
    seeds = [b"task_queue_authority", task_queue.key().as_ref(), queue_authority.key().as_ref()],
    bump = task_queue_authority.bump_seed,
    seeds::program = tuktuk_program::tuktuk::ID,
  )]
  pub task_queue_authority: Box<Account<'info, TaskQueueAuthorityV0>>,

  /// CHECK: This is basically just an arg
  pub authority: AccountInfo<'info>,
  pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeGlobalStateV0>) -> Result<()> {
  ctx.accounts.global_state.set_inner(GlobalStateV0 {
    authority: ctx.accounts.authority.key(),
    task_queue: ctx.accounts.task_queue.key(),
    bump: ctx.bumps.global_state,
  });

  Ok(())
}
