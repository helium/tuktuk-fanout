use anchor_lang::{prelude::*, solana_program::instruction::Instruction, InstructionData};
use anchor_spl::{
  associated_token::get_associated_token_address,
  token::{self, spl_token, Mint, Token, TokenAccount},
};
use tuktuk_program::{
  compile_transaction,
  cron::{
    accounts::{CronJobTransactionV0, CronJobV0},
    cpi::{
      accounts::{AddCronTransactionV0, RemoveCronTransactionV0},
      add_cron_transaction_v0, remove_cron_transaction_v0,
    },
    program::Cron,
    types::{AddCronTransactionArgsV0, RemoveCronTransactionArgsV0},
  },
};

use crate::{
  fanout_seeds, queue_authority_seeds,
  state::{FanoutV0, TokenInflowV0, VoucherV0},
  WalletShareV0,
};

#[derive(Accounts)]
pub struct ClaimV0<'info> {
  #[account(
        has_one = cron_job
    )]
  pub fanout: Account<'info, FanoutV0>,
  #[account(mut)]
  pub cron_job: Box<Account<'info, CronJobV0>>,
  #[account(
    mut,
    seeds = [b"cron_job_transaction", cron_job.key().as_ref(), &voucher.cron_transaction_id.to_le_bytes()[..]],
    bump = cron_job_transaction.bump_seed,
    seeds::program = tuktuk_program::cron::ID,
  )]
  /// CHECK: Init in CPI
  pub cron_job_transaction: Box<Account<'info, CronJobTransactionV0>>,
  #[account(
    seeds = [b"queue_authority"],
    bump = fanout.queue_authority_bump,
  )]
  /// CHECK: Used for signing
  pub queue_authority: AccountInfo<'info>,

  #[account(
        mut,
        seeds = [b"token_inflow", fanout.key().as_ref(), mint.key().as_ref()],
        bump = token_inflow.bump
    )]
  pub token_inflow: Account<'info, TokenInflowV0>,

  #[account(
        mut,
        has_one = fanout,
        has_one = mint,
        has_one = wallet,
        has_one = wallet_share,
    )]
  pub voucher: Account<'info, VoucherV0>,
  pub wallet_share: Account<'info, WalletShareV0>,
  /// CHECK: Checked by has_one
  pub wallet: AccountInfo<'info>,

  pub mint: Account<'info, Mint>,

  #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = fanout
    )]
  pub fanout_token_account: Account<'info, TokenAccount>,

  #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = wallet
    )]
  pub receiver_token_account: Account<'info, TokenAccount>,

  pub token_program: Program<'info, Token>,
  pub cron_program: Program<'info, Cron>,
  pub system_program: Program<'info, System>,
}

const TWELVE_PREC: u128 = 1_000000000000;

pub fn handler(ctx: Context<ClaimV0>) -> Result<()> {
  let token_inflow = &mut ctx.accounts.token_inflow;
  let voucher = &mut ctx.accounts.voucher;
  let fanout = &mut ctx.accounts.fanout;
  token_inflow.update_total_inflow(ctx.accounts.fanout_token_account.amount, fanout);
  // Calculate claimable amount
  let total_inflow_change = token_inflow
    .total_inflow
    .checked_sub(voucher.last_claimed_inflow)
    .unwrap();

  let dist_amount = (total_inflow_change as u128)
    .checked_mul(TWELVE_PREC)
    .unwrap()
    .checked_mul(voucher.shares as u128)
    .unwrap()
    .checked_div(fanout.total_shares as u128)
    .unwrap();

  let mut dist_amount_u64: u64 = dist_amount
    .checked_div(TWELVE_PREC)
    .unwrap()
    .try_into()
    .unwrap();

  let dust: u64 = dist_amount
    .checked_sub((dist_amount_u64 as u128).checked_mul(TWELVE_PREC).unwrap())
    .unwrap()
    .try_into()
    .unwrap();
  let new_dust = dust + voucher.total_dust;
  let whole_dust = new_dust
    .checked_div(u64::try_from(TWELVE_PREC).unwrap())
    .unwrap();
  if whole_dust > 1 {
    dist_amount_u64 = dist_amount_u64.checked_add(1).unwrap();
    voucher.total_dust = new_dust
      .checked_sub(
        whole_dust
          .checked_mul(u64::try_from(TWELVE_PREC).unwrap())
          .unwrap(),
      )
      .unwrap();
  } else {
    voucher.total_dust = new_dust;
  }

  msg!(
    "Total inflow change: {}, dist amount: {}, dust: {}",
    total_inflow_change,
    dist_amount_u64,
    dust
  );

  if dist_amount_u64 > 0 {
    // Transfer tokens
    token::transfer(
      CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::Transfer {
          from: ctx.accounts.fanout_token_account.to_account_info(),
          to: ctx.accounts.receiver_token_account.to_account_info(),
          authority: fanout.to_account_info(),
        },
        &[fanout_seeds!(fanout)],
      ),
      dist_amount_u64,
    )?;
    ctx.accounts.fanout_token_account.reload()?;

    // Update voucher
    voucher.last_claimed_inflow = token_inflow.total_inflow;
    token_inflow.last_snapshot_amount = ctx.accounts.fanout_token_account.amount;
  }

  voucher.shares = ctx.accounts.wallet_share.shares;
  voucher.wallet = ctx.accounts.wallet_share.wallet;

  // Update cron job if wallet differs
  if voucher.wallet != ctx.accounts.wallet_share.wallet {
    let ixs = vec![Instruction {
      program_id: crate::ID,
      accounts: crate::accounts::ClaimV0 {
        fanout: fanout.key(),
        token_inflow: ctx.accounts.token_inflow.key(),
        voucher: ctx.accounts.voucher.key(),
        mint: ctx.accounts.mint.key(),
        fanout_token_account: ctx.accounts.fanout_token_account.key(),
        receiver_token_account: get_associated_token_address(
          &ctx.accounts.wallet_share.wallet,
          &ctx.accounts.mint.key(),
        ),
        token_program: spl_token::ID,
        wallet_share: ctx.accounts.wallet_share.key(),
        wallet: ctx.accounts.wallet_share.wallet,
        cron_job: ctx.accounts.cron_job.key(),
        cron_job_transaction: ctx.accounts.cron_job_transaction.key(),
        cron_program: ctx.accounts.cron_program.key(),
        queue_authority: ctx.accounts.queue_authority.key(),
        system_program: ctx.accounts.system_program.key(),
      }
      .to_account_metas(None),
      data: crate::instruction::ClaimV0.data(),
    }];
    let (compiled_tx, _) = compile_transaction(ixs, vec![])?;

    remove_cron_transaction_v0(
      CpiContext::new_with_signer(
        ctx.accounts.cron_program.to_account_info(),
        RemoveCronTransactionV0 {
          cron_job: ctx.accounts.cron_job.to_account_info(),
          cron_job_transaction: ctx.accounts.cron_job_transaction.to_account_info(),
          authority: ctx.accounts.queue_authority.to_account_info(),
          system_program: ctx.accounts.system_program.to_account_info(),
          rent_refund: ctx.accounts.queue_authority.to_account_info(),
        },
        &[queue_authority_seeds!(ctx.accounts.fanout)],
      ),
      RemoveCronTransactionArgsV0 {
        index: ctx.accounts.voucher.cron_transaction_id,
      },
    )?;

    add_cron_transaction_v0(
      CpiContext::new_with_signer(
        ctx.accounts.cron_program.to_account_info(),
        AddCronTransactionV0 {
          cron_job: ctx.accounts.cron_job.to_account_info(),
          cron_job_transaction: ctx.accounts.cron_job_transaction.to_account_info(),
          payer: ctx.accounts.queue_authority.to_account_info(),
          authority: ctx.accounts.queue_authority.to_account_info(),
          system_program: ctx.accounts.system_program.to_account_info(),
        },
        &[queue_authority_seeds!(ctx.accounts.fanout)],
      ),
      AddCronTransactionArgsV0 {
        index: ctx.accounts.voucher.cron_transaction_id,
        transaction_source: tuktuk_program::cron::types::TransactionSourceV0::CompiledV0(
          compiled_tx.into(),
        ),
      },
    )?;
  }

  Ok(())
}
