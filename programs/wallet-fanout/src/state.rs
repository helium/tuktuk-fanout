use anchor_lang::prelude::*;

// ["global_state"]
#[account]
#[derive(Default)]
pub struct GlobalStateV0 {
  pub authority: Pubkey,
  pub task_queue: Pubkey,
  pub bump: u8,
}

// ["fanout", hash(name)]
#[account]
#[derive(Default)]
pub struct FanoutV0 {
  /// The authority that can modify the fanout configuration
  pub authority: Pubkey,
  pub cron_job: Pubkey,
  /// Total SOL that has flowed into this fanout
  pub total_inflow: u64,
  /// Last snapshotted amount for calculating distributions
  pub last_snapshot_amount: u64,
  /// Total shares across all members
  pub total_shares: u32,
  /// Total shares issued to wallets
  pub total_shares_issued: u32,
  pub next_share_id: u32,
  pub next_cron_transaction_id: u32,
  /// Bump seed for PDA derivation
  pub bump: u8,
  /// Name of the fanout for identification
  pub name: String,
  /// Available cron transaction indexes that can be reused
  pub available_cron_transaction_ides: Vec<u32>,
  /// Bump seed for queue authority PDA derivation
  pub queue_authority_bump: u8,
  /// Number of active token inflows for this fanout
  pub num_inflows: u32,
}

impl FanoutV0 {
  pub fn get_next_cron_transaction_id(&mut self) -> u32 {
    if let Some(index) = self.available_cron_transaction_ides.pop() {
      index
    } else {
      let index = self.next_cron_transaction_id;
      self.next_cron_transaction_id = self.next_cron_transaction_id.checked_add(1).unwrap();
      index
    }
  }

  pub fn return_cron_transaction_id_to_pool(&mut self, index: u32) {
    // Keep the list sorted for easier maintenance
    match self.available_cron_transaction_ides.binary_search(&index) {
      Ok(_) => return, // Already in list
      Err(pos) => self.available_cron_transaction_ides.insert(pos, index),
    }

    // If we have the highest index in available list, reduce next_cron_transaction_id
    while self.next_cron_transaction_id > 0
      && self
        .available_cron_transaction_ides
        .contains(&(self.next_cron_transaction_id - 1))
    {
      self.next_cron_transaction_id -= 1;
      self.available_cron_transaction_ides.pop();
    }
  }
}

// ["token_inflow", fanout, mint]
#[account]
#[derive(Default)]
pub struct TokenInflowV0 {
  /// The fanout this inflow belongs to
  pub fanout: Pubkey,
  /// The mint of the token being tracked
  pub mint: Pubkey,
  /// Total amount of tokens that have flowed into this fanout
  pub total_inflow: u64,
  /// Last snapshotted amount for calculating distributions
  pub last_snapshot_amount: u64,
  pub bump: u8,
  /// The account that will receive rent when this account is closed
  pub rent_refund: Pubkey,
  /// Number of active vouchers for this token inflow
  pub num_vouchers: u32,
}

impl TokenInflowV0 {
  pub fn update_total_inflow(&mut self, new_balance: u64, fanout: &FanoutV0) {
    let tsi = fanout.total_shares_issued;
    let shares_diff = fanout.total_shares.checked_sub(tsi).unwrap();

    let new_inflow = new_balance.checked_sub(self.last_snapshot_amount).unwrap();
    let unissued_correction_factor = (new_inflow as u128)
      .checked_mul(shares_diff as u128)
      .unwrap()
      .checked_div(tsi as u128)
      .unwrap();
    self.total_inflow = self
      .total_inflow
      .checked_add(new_inflow)
      .unwrap()
      .checked_add(unissued_correction_factor as u64)
      .unwrap();
    self.last_snapshot_amount = new_balance;
  }
}

// ["wallet_share", fanout, 0]
#[account]
#[derive(Default)]
pub struct WalletShareV0 {
  /// The fanout this share belongs to
  pub fanout: Pubkey,
  pub index: u32,
  /// The wallet that owns these shares
  pub wallet: Pubkey,
  /// Number of shares allocated to this wallet
  pub shares: u32,
  /// The account that will receive rent when this account is closed
  pub rent_refund: Pubkey,
}

#[account]
#[derive(Default)]
pub struct VoucherV0 {
  /// The wallet share this voucher belongs to
  pub wallet_share: Pubkey,
  /// The wallet that can claim this voucher
  pub wallet: Pubkey,
  pub cron_transaction_id: u32,
  /// The fanout this voucher belongs to
  pub fanout: Pubkey,
  /// The token mint this voucher is for (None/zero for SOL)
  pub mint: Pubkey,
  pub last_claimed_inflow: u64,
  // dust is the amount of tokens that are not divisible by the total shares. Taken to 12 additional decimal places, we attempt to add these back in to the mix
  pub total_dust: u64,
  /// The number of shares at the time this voucher was created or last claimed
  pub shares: u32,
  /// The account that will receive rent when this account is closed
  pub rent_refund: Pubkey,
}

#[macro_export]
macro_rules! fanout_seeds {
  ($fanout:expr) => {
    &[
      b"fanout",
      &anchor_lang::solana_program::hash::hash(&$fanout.name.as_bytes()).to_bytes(),
      &[$fanout.bump],
    ]
  };
}

#[macro_export]
macro_rules! queue_authority_seeds {
  ($fanout:expr) => {
    &[b"queue_authority", &[$fanout.queue_authority_bump]]
  };
}
