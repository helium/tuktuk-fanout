use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
  #[msg("Error in arithmetic")]
  ArithmeticError,
  #[msg("Invalid data increase")]
  InvalidDataIncrease,
  #[msg("Rewards not claimed")]
  RewardsNotClaimed,
  #[msg("Cannot close fanout with active inflows")]
  CannotCloseFanoutWithInflows,
  #[msg("Total shares issued exceeded total shares")]
  TotalSharesExceeded,
}
