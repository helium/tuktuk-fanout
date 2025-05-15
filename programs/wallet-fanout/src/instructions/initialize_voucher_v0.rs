use anchor_lang::{prelude::*, solana_program::instruction::Instruction, InstructionData};
use anchor_spl::{
  associated_token::{get_associated_token_address, AssociatedToken},
  token::{spl_token, Mint, Token, TokenAccount},
};
use tuktuk_program::{
  compile_transaction,
  cron::{
    accounts::CronJobV0,
    cpi::{accounts::AddCronTransactionV0, add_cron_transaction_v0},
    program::Cron,
    types::AddCronTransactionArgsV0,
  },
};

use crate::{
  queue_authority_seeds,
  state::{FanoutV0, TokenInflowV0, VoucherV0, WalletShareV0},
};

#[derive(Accounts)]
pub struct InitializeVoucherV0<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,
  #[account(
    mut,
    has_one = cron_job
  )]
  pub fanout: Account<'info, FanoutV0>,

  #[account(
        init_if_needed,
        payer = payer,
        space = 8 + 60 + std::mem::size_of::<TokenInflowV0>(),
        seeds = [b"token_inflow", fanout.key().as_ref(), mint.key().as_ref()],
        bump
    )]
  pub token_inflow: Account<'info, TokenInflowV0>,

  #[account(
    init_if_needed,
    payer = payer,
    associated_token::mint = mint,
    associated_token::authority = fanout,
  )]
  pub fanout_token_account: Account<'info, TokenAccount>,

  #[account(
        init,
        payer = payer,
        space = 8 + 60 + std::mem::size_of::<VoucherV0>(),
        seeds = [
            b"voucher",
            fanout.key().as_ref(),
            mint.key().as_ref(),
            wallet_share.key().as_ref()
        ],
        bump
    )]
  pub voucher: Account<'info, VoucherV0>,

  #[account(
        has_one = fanout,
    )]
  pub wallet_share: Account<'info, WalletShareV0>,

  pub mint: Account<'info, Mint>,
  #[account(
    seeds = [b"queue_authority"],
    bump = fanout.queue_authority_bump,
  )]
  /// CHECK: Used for signing
  pub authority: AccountInfo<'info>,

  #[account(mut, has_one = authority)]
  pub cron_job: Box<Account<'info, CronJobV0>>,
  #[account(mut)]
  /// CHECK: Init in CPI
  pub cron_job_transaction: AccountInfo<'info>,
  pub cron_program: Program<'info, Cron>,
  pub system_program: Program<'info, System>,
  pub token_program: Program<'info, Token>,
  pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx: Context<InitializeVoucherV0>) -> Result<()> {
  let fanout = &mut ctx.accounts.fanout;

  // Initialize token inflow if needed
  if ctx.accounts.token_inflow.fanout == Pubkey::default() {
    ctx.accounts.token_inflow.set_inner(TokenInflowV0 {
      fanout: fanout.key(),
      mint: ctx.accounts.mint.key(),
      total_inflow: 0,
      last_snapshot_amount: 0,
      bump: ctx.bumps.token_inflow,
      rent_refund: ctx.accounts.payer.key(),
      num_vouchers: 0,
    });
    // Increment fanout's inflow count
    fanout.num_inflows = fanout.num_inflows.checked_add(1).unwrap();
  }

  // After initializing the token_inflow
  ctx.accounts.token_inflow.num_vouchers = ctx
    .accounts
    .token_inflow
    .num_vouchers
    .checked_add(1)
    .unwrap();

  let cron_transaction_id = fanout.get_next_cron_transaction_id();

  ctx.accounts.voucher.set_inner(VoucherV0 {
    wallet: ctx.accounts.wallet_share.wallet,
    fanout: fanout.key(),
    mint: ctx.accounts.mint.key(),
    cron_transaction_id,
    last_claimed_inflow: ctx.accounts.token_inflow.total_inflow,
    total_dust: 0,
    wallet_share: ctx.accounts.wallet_share.key(),
    shares: ctx.accounts.wallet_share.shares,
    rent_refund: ctx.accounts.payer.key(),
  });

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
      queue_authority: ctx.accounts.authority.key(),
      cron_program: ctx.accounts.cron_program.key(),
      system_program: ctx.accounts.system_program.key(),
    }
    .to_account_metas(None),
    data: crate::instruction::ClaimV0.data(),
  }];
  let (compiled_tx, _) = compile_transaction(ixs, vec![])?;

  add_cron_transaction_v0(
    CpiContext::new_with_signer(
      ctx.accounts.cron_program.to_account_info(),
      AddCronTransactionV0 {
        cron_job: ctx.accounts.cron_job.to_account_info(),
        cron_job_transaction: ctx.accounts.cron_job_transaction.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
      },
      &[queue_authority_seeds!(ctx.accounts.fanout)],
    ),
    AddCronTransactionArgsV0 {
      index: cron_transaction_id,
      transaction_source: tuktuk_program::cron::types::TransactionSourceV0::CompiledV0(
        compiled_tx.into(),
      ),
    },
  )?;

  Ok(())
}
