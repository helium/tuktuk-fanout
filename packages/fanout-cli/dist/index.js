#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const web3_js_1 = require("@solana/web3.js");
const wallet_fanout_sdk_1 = require("@helium/wallet-fanout-sdk");
const tuktuk_sdk_1 = require("@helium/tuktuk-sdk");
const anchor = __importStar(require("@coral-xyz/anchor"));
const dotenv_1 = require("dotenv");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
(0, dotenv_1.config)();
const DEFAULT_KEY_PATH = path.join(os.homedir(), '.config/solana/id.json');
async function initializeGlobalState(taskQueueName, opts) {
    try {
        // Load keypair
        const keypairPath = opts.keypairPath || DEFAULT_KEY_PATH;
        if (!fs.existsSync(keypairPath)) {
            throw new Error(`Keypair file not found at ${keypairPath}`);
        }
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        const keypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(keypairData));
        // Setup connection and provider
        const connection = new web3_js_1.Connection(opts.rpcUrl || process.env.RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
        // @ts-ignore
        const wallet = new anchor.Wallet(keypair);
        const provider = new anchor.AnchorProvider(
        // @ts-ignore
        connection, wallet, { commitment: 'confirmed' });
        // Initialize tuktuk program
        // @ts-ignore
        const tuktukProgram = await (0, tuktuk_sdk_1.init)(provider);
        const tuktukConfig = (0, tuktuk_sdk_1.tuktukConfigKey)()[0];
        const queueAuthority = (0, wallet_fanout_sdk_1.queueAuthorityKey)()[0];
        // Get task queue config
        const config = await tuktukProgram.account.tuktukConfigV0.fetch(tuktukConfig);
        const nextTaskQueueId = config.nextTaskQueueId;
        const taskQueue = (0, tuktuk_sdk_1.taskQueueKey)(tuktukConfig, nextTaskQueueId)[0];
        console.log('Initializing task queue...');
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
            taskQueueNameMapping: (0, tuktuk_sdk_1.taskQueueNameMappingKey)(tuktukConfig, taskQueueName)[0],
        })
            .rpc();
        console.log('Adding queue authority...');
        // Add queue authority
        await tuktukProgram.methods
            .addQueueAuthorityV0()
            .accounts({
            payer: keypair.publicKey,
            queueAuthority,
            taskQueue,
        })
            .rpc();
        // Initialize fanout program
        // @ts-ignore
        const program = await (0, wallet_fanout_sdk_1.init)(provider);
        console.log('Initializing global state...');
        // Initialize global state
        await program.methods
            .initializeGlobalStateV0()
            .accounts({
            payer: keypair.publicKey,
            taskQueue,
            authority: keypair.publicKey,
        })
            .rpc();
        console.log(`Successfully initialized task queue and global state: ${taskQueueName}`);
    }
    catch (error) {
        console.error('Failed to initialize:', error);
        process.exit(1);
    }
}
const program = new commander_1.Command();
program
    .name('fanout')
    .description('CLI tool for managing Helium Fanout')
    .version('0.0.1');
program
    .command('init')
    .description('Initialize task queue and global state')
    .argument('<taskQueueName>', 'name of the task queue')
    .option('-k, --keypair <path>', 'path to keypair file')
    .option('-u, --url <url>', 'RPC URL')
    .option('-r, --min-crank-reward <number>', 'minimum crank reward', '1')
    .option('-c, --capacity <number>', 'task queue capacity', '1000')
    .action(async (taskQueueName, opts) => {
    await initializeGlobalState(taskQueueName, {
        keypairPath: opts.keypair,
        rpcUrl: opts.url,
        minCrankReward: parseInt(opts.minCrankReward),
        capacity: parseInt(opts.capacity)
    });
});
program.parse(process.argv);
