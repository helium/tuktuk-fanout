import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Cron } from "@helium/tuktuk-idls/lib/types/cron";
import { cronJobKey, cronJobNameMappingKey, init as initCron, userCronJobsKey, PROGRAM_ID as CRON_PROGRAM_ID, cronJobTransactionKey } from "@helium/cron-sdk";
import { Tuktuk } from "@helium/tuktuk-idls/lib/types/tuktuk";
import { init as initTuktuk, nextAvailableTaskIds, runTask, taskKey, taskQueueKey, taskQueueNameMappingKey, tuktukConfigKey } from "@helium/tuktuk-sdk";
import { ComputeBudgetInstruction, ComputeBudgetProgram, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { fanoutKey, globalStateKey, init, PROGRAM_ID, queueAuthorityKey, tokenInflowKey } from "../packages/wallet-fanout-sdk/src";
import { WalletFanout } from "../target/types/wallet_fanout";
import { expect } from "chai";
import { createAtaAndMint, createMint, sendInstructions } from "@helium/spl-utils";
import { execSync } from "child_process";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";

export const ANCHOR_PATH = "anchor";

export async function ensureIdls() {
  let programs = [
    {
      name: "wallet_fanout",
      pid: "fanqeMu3fw8R4LwKNbahPtYXJsyLL6NXyfe2BqzhfB6",
    },
  ];
  await Promise.all(
    programs.map(async (program) => {
      try {
        execSync(
          `${ANCHOR_PATH} idl init --filepath ${__dirname}/../target/idl/${program.name}.json ${program.pid}`,
          { stdio: "inherit", shell: "/bin/bash" }
        );
      } catch {
        execSync(
          `${ANCHOR_PATH} idl upgrade --filepath ${__dirname}/../target/idl/${program.name}.json ${program.pid}`,
          { stdio: "inherit", shell: "/bin/bash" }
        );
      }
    })
  );
}

describe("fanout", () => {
  anchor.setProvider(anchor.AnchorProvider.local("http://127.0.0.1:8899"));

  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const me = provider.wallet.publicKey;

  let taskQueueName = `test-${Math.random().toString(36).substring(2, 15)}`;
  let program: Program<WalletFanout>;
  let cronProgram: Program<Cron>;
  let tuktukProgram: Program<Tuktuk>;
  let fanoutName: string;
  const tuktukConfig: PublicKey = tuktukConfigKey()[0];
  const queueAuthority = queueAuthorityKey()[0]

  let taskQueue: PublicKey;
  before(async () => {
    await ensureIdls();
    program = await init(provider, PROGRAM_ID, anchor.workspace.WalletFanout.idl);
    tuktukProgram = await initTuktuk(provider);
    cronProgram = await initCron(provider);
    const globalStateK = globalStateKey(PROGRAM_ID)[0]
    const globalState = await program.account.globalStateV0.fetchNullable(globalStateK)
    if (!globalState) {
      const config = await tuktukProgram.account.tuktukConfigV0.fetch(
        tuktukConfig
      );
      const nextTaskQueueId = config.nextTaskQueueId;
      taskQueue = taskQueueKey(tuktukConfig, nextTaskQueueId)[0];

      await tuktukProgram.methods
        .initializeTaskQueueV0({
          name: taskQueueName,
          minCrankReward: new anchor.BN(1),
          capacity: 1000,
          lookupTables: [],
          staleTaskAge: 10000,
        })
        .accounts({
          tuktukConfig,
          payer: me,
          updateAuthority: me,
          taskQueue,
          taskQueueNameMapping: taskQueueNameMappingKey(tuktukConfig, taskQueueName)[0],
        })
        .rpc();

      await tuktukProgram.methods
        .addQueueAuthorityV0()
        .accounts({
          payer: me,
          queueAuthority,
          taskQueue,
        })
        .rpc();

      await program.methods.initializeGlobalStateV0()
        .accounts({
          payer: me,
          taskQueue,
          authority: me,
        })
        .rpc();
    } else {
      taskQueue = globalState.taskQueue
    }
  })

  beforeEach(async () => {
    fanoutName = `test-${Math.random().toString(36).substring(2, 15)}`;
  })


  it("should initialize a fanout", async () => {
    const userCronJobsK = userCronJobsKey(queueAuthority)[0]
    const userCronJobs = await cronProgram.account.userCronJobsV0.fetchNullable(userCronJobsK)
    let cronJobId = userCronJobs?.nextCronJobId || 0
    const taskQueueAcc = await tuktukProgram.account.taskQueueV0.fetch(taskQueue)
    const nextTask = nextAvailableTaskIds(taskQueueAcc.taskBitmap, 1, false)[0]
    const cronJobK = cronJobKey(queueAuthority, cronJobId)[0]

    const { pubkeys: { fanout } } = await program.methods.initializeFanoutV0({
      name: fanoutName,
      schedule: "0 0 * * * *",
      totalShares: 100,
    })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 })
      ])
      .accounts({
        payer: me,
        authority: me,
        fanout: fanoutKey(fanoutName)[0],
        cronJob: cronJobK,
        userCronJobs: userCronJobsK,
        cronJobNameMapping: cronJobNameMappingKey(queueAuthority, fanoutName)[0],
        task: taskKey(taskQueue, nextTask)[0],
        taskReturnAccount1: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_1"), cronJobK.toBuffer()], CRON_PROGRAM_ID)[0],
        taskReturnAccount2: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_2"), cronJobK.toBuffer()], CRON_PROGRAM_ID)[0]
      })
      .rpcAndKeys()

    const fanoutAcc = await program.account.fanoutV0.fetch(fanout)
    const cronJobAcc = await cronProgram.account.cronJobV0.fetch(cronJobK)

    expect(fanoutAcc.name).to.equal(fanoutName)
    expect(fanoutAcc.totalShares).to.equal(100)

    expect(cronJobAcc.name).to.equal(fanoutName)
    expect(cronJobAcc.schedule).to.equal("0 0 * * * *")
    expect(cronJobAcc.freeTasksPerTransaction).to.equal(0)
    expect(cronJobAcc.numTasksPerQueueCall).to.equal(5)
  });

  describe("with a fanout", () => {
    let fanout: PublicKey;
    let cronJob: PublicKey;
    beforeEach(async () => {
      const userCronJobsK = userCronJobsKey(queueAuthority)[0]
      const userCronJobs = await cronProgram.account.userCronJobsV0.fetchNullable(userCronJobsK)
      let cronJobId = userCronJobs?.nextCronJobId || 0
      const taskQueueAcc = await tuktukProgram.account.taskQueueV0.fetch(taskQueue)
      const nextTask = nextAvailableTaskIds(taskQueueAcc.taskBitmap, 1, false)[0]
      const cronJobK = cronJobKey(queueAuthority, cronJobId)[0]
      cronJob = cronJobK

      const now = new Date()
      let nextSeconds = now.getSeconds() + 2
      let nextMinutes = now.getMinutes()
      if (nextSeconds > 59) {
        nextSeconds = 0 + (nextSeconds - 59)
        nextMinutes = now.getMinutes() + 1
      }
      const { pubkeys: { fanout: fanoutK } } = await program.methods.initializeFanoutV0({
        name: fanoutName,
        // Run in 2 seconds
        schedule: `${nextSeconds} ${nextMinutes} * * * *`,
        totalShares: 100,
      })
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 })
        ])
        .accounts({
          payer: me,
          authority: me,
          fanout: fanoutKey(fanoutName)[0],
          cronJob: cronJobK,
          userCronJobs: userCronJobsK,
          cronJobNameMapping: cronJobNameMappingKey(queueAuthority, fanoutName)[0],
          task: taskKey(taskQueue, nextTask)[0],
          taskReturnAccount1: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_1"), cronJobK.toBuffer()], CRON_PROGRAM_ID)[0],
          taskReturnAccount2: PublicKey.findProgramAddressSync([Buffer.from("task_return_account_2"), cronJobK.toBuffer()], CRON_PROGRAM_ID)[0]
        })
        .rpcAndKeys()

      await sendInstructions(provider, [SystemProgram.transfer({
        fromPubkey: me,
        toPubkey: cronJob,
        lamports: 1000000000,
      })]);

      fanout = fanoutK
    })

    it("should allow adding a wallet", async () => {
      const newWallet = Keypair.generate()
      const { pubkeys: { walletShare } } = await program.methods.updateWalletShareV0({
        shares: 10,
        index: 0,
      })
        .accounts({
          payer: me,
          fanout,
          wallet: newWallet.publicKey,
        })
        .rpcAndKeys()

      const waleltShareAcc = await program.account.walletShareV0.fetch(walletShare)
      expect(waleltShareAcc.fanout.toBase58()).to.equal(fanout.toBase58())
      expect(waleltShareAcc.shares).to.equal(10)
      expect(waleltShareAcc.index).to.equal(0)
      expect(waleltShareAcc.wallet.toBase58()).to.equal(newWallet.publicKey.toBase58())
    })

    describe("with multiple wallets", () => {
      const newWallet1 = Keypair.generate()
      const newWallet2 = Keypair.generate()
      let mint: PublicKey;

      let walletShare1: PublicKey;
      let walletShare2: PublicKey;

      beforeEach(async () => {
        mint = await createMint(provider, 8, me, me)
        await createAtaAndMint(provider, mint, 1000000000, fanout)
        await createAtaAndMint(provider, mint, 0, newWallet1.publicKey)
        await createAtaAndMint(provider, mint, 0, newWallet2.publicKey)
        const { pubkeys: { walletShare: walletShare1K } } = await program.methods.updateWalletShareV0({
          shares: 10,
          index: 0,
        })
          .accounts({
            payer: me,
            fanout,
            wallet: newWallet1.publicKey,
          })
          .rpcAndKeys()

        walletShare1 = walletShare1K

        const { pubkeys: { walletShare: walletShare2K } } = await program.methods.updateWalletShareV0({
          shares: 30,
          index: 1,
        })
          .accounts({
            payer: me,
            fanout,
            wallet: newWallet2.publicKey,
          })
          .rpcAndKeys()

        walletShare2 = walletShare2K
      })

      it("should allow initializing voucher", async () => {
        const { pubkeys: { voucher } } = await program.methods.initVoucherV0()
          .accounts({
            payer: me,
            mint,
            walletShare: walletShare1,
            cronJobTransaction: cronJobTransactionKey(cronJob, 0)[0]
          })
          .rpcAndKeys()

        const voucherAcc = await program.account.voucherV0.fetch(voucher)
        expect(voucherAcc.mint.toBase58()).to.equal(mint.toBase58())
        expect(voucherAcc.walletShare.toBase58()).to.equal(walletShare1.toBase58())
        expect(voucherAcc.fanout.toBase58()).to.equal(fanout.toBase58())
        expect(voucherAcc.shares).to.equal(10)
        expect(voucherAcc.wallet.toBase58()).to.equal(newWallet1.publicKey.toBase58())
      })

      describe("with multiple vouchers", () => {
        let voucher1: PublicKey;
        let voucher2: PublicKey;

        beforeEach(async () => {
          const { pubkeys: { voucher: voucher1K } } = await program.methods.initVoucherV0()
            .accounts({
              payer: me,
              mint,
              walletShare: walletShare1,
              cronJobTransaction: cronJobTransactionKey(cronJob, 0)[0]
            })
            .rpcAndKeys()
          const { pubkeys: { voucher: voucher2K } } = await program.methods.initVoucherV0()
            .accounts({
              payer: me,
              mint,
              walletShare: walletShare2,
              cronJobTransaction: cronJobTransactionKey(cronJob, 1)[0]
            })
            .rpcAndKeys()

          voucher1 = voucher1K
          voucher2 = voucher2K
        })

        async function runAllTasks() {
          const taskQueueAcc = await tuktukProgram.account.taskQueueV0.fetch(taskQueue);

          // Find all task IDs that need to be executed (have a 1 in the bitmap)
          const taskIds: number[] = [];
          for (let i = 0; i < taskQueueAcc.taskBitmap.length; i++) {
            const byte = taskQueueAcc.taskBitmap[i];
            for (let bit = 0; bit < 8; bit++) {
              if ((byte & (1 << bit)) !== 0) {
                taskIds.push(i * 8 + bit);
              }
            }
          }

          // Execute all tasks in parallel
          for (const taskId of taskIds) {
            const task = taskKey(taskQueue, taskId)[0]
            const taskAcc = await tuktukProgram.account.taskV0.fetch(task)
            if ((taskAcc.trigger.timestamp?.[0]?.toNumber() || 0) > (new Date().getTime() / 1000)) {
              continue
            }
            console.log("Running task", taskId)
            await sendInstructions(
              provider,
              [
                ComputeBudgetProgram.setComputeUnitLimit({ units: 1000000 }),
                ...await runTask({
                  program: tuktukProgram,
                  task: taskKey(taskQueue, taskId)[0],
                  crankTurner: me,
                })]
            );
          }
        }

        it("should claim vouchers via tuktuk", async () => {
          // First run to trigger the cron job to trigger the tasks
          await runAllTasks()
          await new Promise(resolve => setTimeout(resolve, 2000))
          // Second run to process the tasks
          await runAllTasks()

          // Verify the claims were processed
          const fanoutTokenAccount = await getAccount(
            // @ts-ignore
            provider.connection,
            getAssociatedTokenAddressSync(mint, fanout, true)
          );
          const wallet1TokenAccount = await getAccount(
            // @ts-ignore
            provider.connection,
            getAssociatedTokenAddressSync(mint, newWallet1.publicKey)
          );
          const wallet2TokenAccount = await getAccount(
            // @ts-ignore
            provider.connection,
            getAssociatedTokenAddressSync(mint, newWallet2.publicKey)
          );

          expect(Number(fanoutTokenAccount.amount)).to.equal(0);
          expect(Number(wallet1TokenAccount.amount)).to.equal(250000000);
          expect(Number(wallet2TokenAccount.amount)).to.equal(750000000);

          // Verify vouchers were updated
          const voucher1Acc = await program.account.voucherV0.fetch(voucher1);
          const voucher2Acc = await program.account.voucherV0.fetch(voucher2);

          const tokenInflowAcc = await program.account.tokenInflowV0.fetch(
            tokenInflowKey(fanout, mint)[0]
          );

          expect(voucher1Acc.lastClaimedInflow.toString()).to.equal(tokenInflowAcc.totalInflow.toString());
          expect(voucher2Acc.lastClaimedInflow.toString()).to.equal(tokenInflowAcc.totalInflow.toString());
        })

        describe("with claimed rewards", () => {
          beforeEach(async () => {
            await runAllTasks()
            await new Promise(resolve => setTimeout(resolve, 2000))
            await runAllTasks()
          })

          it("should allow closing wallet shares, vouchers, inflow, then fanout", async () => {
            await program.methods.closeWalletShareV0()
              .accounts({
                walletShare: walletShare1,
              })
              .rpc()

            await program.methods.closeVoucherV0()
              .accounts({
                voucher: voucher1,
                cronJobTransaction: cronJobTransactionKey(cronJob, 0)[0],
                tokenInflow: tokenInflowKey(fanout, mint)[0],
              })
              .rpc()

            await program.methods.closeWalletShareV0()
              .accounts({
                walletShare: walletShare2,
              })
              .rpc()

            await program.methods.closeVoucherV0()
              .accounts({
                voucher: voucher2,
                cronJobTransaction: cronJobTransactionKey(cronJob, 1)[0],
                tokenInflow: tokenInflowKey(fanout, mint)[0],
              })
              .rpc()

            await program.methods.closeTokenInflowV0()
              .accounts({
                tokenInflow: tokenInflowKey(fanout, mint)[0],
              })
              .rpc()

            await program.methods.closeFanoutV0()
              .accounts({
                fanout,
                userCronJobs: userCronJobsKey(queueAuthorityKey()[0])[0],
                cronJobNameMapping: cronJobNameMappingKey(queueAuthorityKey()[0], fanoutName)[0],
                taskReturnAccount1: PublicKey.findProgramAddressSync(
                  [Buffer.from("task_return_account_1"), cronJob.toBuffer()],
                  CRON_PROGRAM_ID
                )[0],
                taskReturnAccount2: PublicKey.findProgramAddressSync(
                  [Buffer.from("task_return_account_2"), cronJob.toBuffer()],
                  CRON_PROGRAM_ID
                )[0],
              })
              .rpc()

            expect(
              await program.account.tokenInflowV0.fetchNullable(tokenInflowKey(fanout, mint)[0])
            ).to.be.null
            expect(
              await program.account.voucherV0.fetchNullable(voucher1)
            ).to.be.null
            expect(
              await program.account.voucherV0.fetchNullable(voucher2)
            ).to.be.null
            expect(
              await program.account.walletShareV0.fetchNullable(walletShare1)
            ).to.be.null
            expect(
              await program.account.walletShareV0.fetchNullable(walletShare2)
            ).to.be.null
            expect(
              await program.account.fanoutV0.fetchNullable(fanout)
            ).to.be.null
            expect(
              await cronProgram.account.cronJobV0.fetchNullable(cronJob)
            ).to.be.null
          })
        })
      })
    })
  })
});