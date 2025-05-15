#!/usr/bin/env node

import { Command } from 'commander'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { init as initFanout, globalStateKey, queueAuthorityKey } from '@helium/wallet-fanout-sdk'
import { init as initTuktuk, taskQueueKey, taskQueueNameMappingKey, tuktukConfigKey } from '@helium/tuktuk-sdk'
import * as anchor from '@coral-xyz/anchor'
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

config()

const DEFAULT_KEY_PATH = path.join(os.homedir(), '.config/solana/id.json')

async function initializeGlobalState(taskQueueName: string, opts: { 
  keypairPath?: string,
  rpcUrl?: string,
  minCrankReward?: number,
  capacity?: number 
}) {
  try {
    // Load keypair
    const keypairPath = opts.keypairPath || DEFAULT_KEY_PATH
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Keypair file not found at ${keypairPath}`)
    }
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'))
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData))

    // Setup connection and provider
    const connection = new Connection(
      opts.rpcUrl || process.env.RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    // @ts-ignore
    const wallet = new anchor.Wallet(keypair)
    const provider = new anchor.AnchorProvider(
      // @ts-ignore
      connection,
      wallet,
      { commitment: 'confirmed' }
    )

    // Initialize tuktuk program
    // @ts-ignore
    const tuktukProgram = await initTuktuk(provider)
    const tuktukConfig = tuktukConfigKey()[0]
    const queueAuthority = queueAuthorityKey()[0]

    // Get task queue config
    const config = await tuktukProgram.account.tuktukConfigV0.fetch(tuktukConfig)
    const nextTaskQueueId = config.nextTaskQueueId
    const taskQueue = taskQueueKey(tuktukConfig, nextTaskQueueId)[0]

    console.log('Initializing task queue...')
    // Initialize task queue
    await tuktukProgram.methods
      .initializeTaskQueueV0({
        name: taskQueueName,
        minCrankReward: new anchor.BN(opts.minCrankReward || 1),
        capacity: opts.capacity || 1000,
        lookupTables: [],
        // 48 hours
        staleTaskAge: 60 * 60 * 24 * 2,
      })
      .accounts({
        tuktukConfig,
        payer: keypair.publicKey,
        updateAuthority: keypair.publicKey,
        taskQueue,
        taskQueueNameMapping: taskQueueNameMappingKey(tuktukConfig, taskQueueName)[0],
      })
      .rpc()

    console.log('Adding queue authority...')
    // Add queue authority
    await tuktukProgram.methods
      .addQueueAuthorityV0()
      .accounts({
        payer: keypair.publicKey,
        queueAuthority,
        taskQueue,
      })
      .rpc()

    // Initialize fanout program
    // @ts-ignore
    const program = await initFanout(provider)
    console.log('Initializing global state...')
    // Initialize global state
    await program.methods
      .initializeGlobalStateV0()
      .accounts({
        payer: keypair.publicKey,
        taskQueue,
        authority: keypair.publicKey,
      })
      .rpc()

    console.log(`Successfully initialized task queue and global state: ${taskQueueName}`)
    
  } catch (error) {
    console.error('Failed to initialize:', error)
    process.exit(1)
  }
}

const program = new Command()

program
  .name('fanout')
  .description('CLI tool for managing Helium Fanout')
  .version('0.0.1')

program
  .command('init')
  .description('Initialize task queue and global state')
  .argument('<taskQueueName>', 'name of the task queue')
  .option('-k, --keypair <path>', 'path to keypair file')
  .option('-u, --url <url>', 'RPC URL')
  .option('-r, --min-crank-reward <number>', 'minimum crank reward', '1')
  .option('-c, --capacity <number>', 'task queue capacity', '1000')
  .action(async (taskQueueName: string, opts: {
    keypair: string,
    url: string,
    minCrankReward: string,
    capacity: string
  }) => {
    await initializeGlobalState(taskQueueName, {
      keypairPath: opts.keypair,
      rpcUrl: opts.url,
      minCrankReward: parseInt(opts.minCrankReward),
      capacity: parseInt(opts.capacity)
    })
  })

program.parse(process.argv) 