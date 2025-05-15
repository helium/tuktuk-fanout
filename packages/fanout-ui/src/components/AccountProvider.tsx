import { AccountProvider as AccountFetchCacheProvider } from '@helium/account-fetch-cache-hooks'
import { useConnection } from '@solana/wallet-adapter-react'
import { Connection } from '@solana/web3.js'
import React from 'react'

export const AccountProvider = ({ children }: { children: React.ReactNode }) => {
  const { connection } = useConnection()
  return (
    <AccountFetchCacheProvider
      connection={connection as Connection}
      extendConnection
      commitment="confirmed"
    >
      {children}
    </AccountFetchCacheProvider>
  );
}