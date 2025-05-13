use anchor_lang::prelude::*;
#[cfg(not(feature = "no-entrypoint"))]
use {default_env::default_env, solana_security_txt::security_txt};

declare_id!("fanqeMu3fw8R4LwKNbahPtYXJsyLL6NXyfe2BqzhfB6");

pub mod errors;
pub mod instructions;
pub mod resize_to_fit;
pub mod state;

pub use instructions::*;
pub use state::*;

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
  name: "Wallet Fanout",
  project_url: "http://helium.com",
  contacts: "email:hello@helium.foundation",
  policy: "https://github.com/helium/helium-program-library/tree/master/SECURITY.md",

  // Optional Fields
  preferred_languages: "en",
  source_code: "https://github.com/helium/tuktuk-fanout/tree/master/programs/wallet-fanout",
  source_revision: default_env!("GITHUB_SHA", ""),
  source_release: default_env!("GITHUB_REF_NAME", ""),
  auditors: "Sec3"
}

#[program]
pub mod wallet_fanout {
  use super::*;

  pub fn initialize_global_state_v0(ctx: Context<InitializeGlobalStateV0>) -> Result<()> {
    instructions::initialize_global_state_v0::handler(ctx)
  }

  pub fn initialize_fanout_v0(
    ctx: Context<InitializeFanoutV0>,
    args: InitializeFanoutV0Args,
  ) -> Result<()> {
    instructions::initialize_fanout_v0::handler(ctx, args)
  }

  pub fn update_wallet_share_v0(
    ctx: Context<UpdateWalletShareV0>,
    args: UpdateWalletShareV0Args,
  ) -> Result<()> {
    instructions::update_wallet_share_v0::handler(ctx, args)
  }

  pub fn init_voucher_v0(ctx: Context<InitVoucherV0>) -> Result<()> {
    instructions::init_voucher_v0::handler(ctx)
  }

  pub fn claim_v0(ctx: Context<ClaimV0>) -> Result<()> {
    instructions::claim_v0::handler(ctx)
  }

  pub fn close_token_inflow_v0(ctx: Context<CloseTokenInflowV0>) -> Result<()> {
    instructions::close_token_inflow_v0::handler(ctx)
  }

  pub fn close_wallet_share_v0(ctx: Context<CloseWalletShareV0>) -> Result<()> {
    instructions::close_wallet_share_v0::handler(ctx)
  }

  pub fn close_voucher_v0(ctx: Context<CloseVoucherV0>) -> Result<()> {
    instructions::close_voucher_v0::handler(ctx)
  }

  pub fn close_fanout_v0(ctx: Context<CloseFanoutV0>) -> Result<()> {
    instructions::close_fanout_v0::handler(ctx)
  }
}
