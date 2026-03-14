/**
 * Hardhat Time-Warp Gauntlet
 *
 * This script deploys, seeds, and runs two critical edge-case tests:
 *
 * Test 1: Lock Period + Urgency Banner
 *   - Creates a market with 3-day resolution
 *   - Fast-forwards EVM to 1 hour before resolution (inside 2h lock window)
 *   - Verifies bet() reverts with BettingLocked()
 *   - Frontend should show UrgencyBanner locked state + disabled inputs
 *
 * Test 2: Zero-Winner Fallback
 *   - Creates a market, places bets ONLY on NO side
 *   - Fast-forwards past resolution, resolves as YES winner
 *   - YES pool is 0 → normal redeem() fails
 *   - redeemZeroWinnerFallback() refunds NO bettors
 *
 * Usage:
 *   npx hardhat run scripts/gauntlet.ts --network localhost
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer, alice, bob] = await ethers.getSigners();
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║          HARDHAT TIME-WARP GAUNTLET              ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log("Deployer:", deployer.address);
  console.log("Alice:   ", alice.address);
  console.log("Bob:     ", bob.address);

  // ─── Deploy Infrastructure ───
  console.log("\n── Deploying infrastructure ──");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log("USDC:", usdcAddr);

  const AGDPOracle = await ethers.getContractFactory("AGDPOracle");
  const oracle = await AGDPOracle.deploy(deployer.address, 3600);
  await oracle.waitForDeployment();

  const FeeRouter = await ethers.getContractFactory("FeeRouter");
  const feeRouter = await FeeRouter.deploy(deployer.address, 5000);
  await feeRouter.waitForDeployment();

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(
    await oracle.getAddress(),
    await feeRouter.getAddress(),
    500, // 5% redemption fee
    500  // 5% withdrawal fee
  );
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("Factory:", factoryAddr);

  await factory.addCollateral(usdcAddr);

  // Mint USDC to everyone
  const MINT = ethers.parseUnits("1000000", 6);
  await usdc.mint(deployer.address, MINT);
  await usdc.mint(alice.address, MINT);
  await usdc.mint(bob.address, MINT);
  console.log("Minted 1M USDC to all signers\n");

  // ─── Get current block timestamp ───
  const latestBlock = await ethers.provider.getBlock("latest");
  const now = latestBlock!.timestamp;
  const THREE_DAYS = 3 * 24 * 60 * 60; // 259200 seconds
  const TWO_HOURS = 2 * 60 * 60;       // 7200 seconds

  // ═══════════════════════════════════════════
  // TEST 1: Lock Period + Urgency Banner
  // ═══════════════════════════════════════════
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  TEST 1: LOCK PERIOD & URGENCY BANNER           ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const resolutionTime1 = now + THREE_DAYS;
  const SEED = ethers.parseUnits("5000", 6);

  await usdc.approve(factoryAddr, SEED);
  const tx1 = await factory.createMarket(
    "Will Ethy win Epoch 24?",
    0, // EPOCH_WINNER
    usdcAddr,
    resolutionTime1,
    SEED
  );
  const receipt1 = await tx1.wait();
  const markets = await factory.getMarkets();
  const market1Addr = markets[0];
  console.log("Market 1 created:", market1Addr);
  console.log("Resolution time:", new Date(resolutionTime1 * 1000).toISOString());
  console.log("Lock time:      ", new Date((resolutionTime1 - TWO_HOURS) * 1000).toISOString());

  const market1 = await ethers.getContractAt("ParimutuelMarket", market1Addr);

  // Place a normal bet first (should succeed)
  const BET_AMOUNT = ethers.parseUnits("1000", 6);
  await usdc.connect(alice).approve(market1Addr, BET_AMOUNT);
  await market1.connect(alice).bet(0, BET_AMOUNT); // YES
  console.log("\n✅ Alice bet 1000 USDC on YES (before lock period)");

  // Check isLocked before warp
  const lockedBefore = await market1.isLocked();
  console.log("isLocked() before warp:", lockedBefore, "(expected: false)");

  // Fast-forward to 1 hour before resolution (inside the 2-hour lock window)
  const warpSeconds = THREE_DAYS - 3600; // 3 days minus 1 hour = 255600 seconds
  console.log(`\n⏩ Fast-forwarding ${warpSeconds} seconds (to 1h before resolution)...`);
  await ethers.provider.send("evm_increaseTime", [warpSeconds]);
  await ethers.provider.send("evm_mine", []);

  const lockedAfter = await market1.isLocked();
  console.log("isLocked() after warp:", lockedAfter, "(expected: true)");

  // Try to bet — should revert with BettingLocked
  console.log("\n🔒 Attempting bet during lock period...");
  try {
    await usdc.connect(bob).approve(market1Addr, BET_AMOUNT);
    await market1.connect(bob).bet(1, BET_AMOUNT); // NO
    console.log("❌ ERROR: Bet succeeded but should have reverted!");
  } catch (err: any) {
    const reason = err.message || "";
    if (reason.includes("BettingLocked")) {
      console.log("✅ Correctly reverted with BettingLocked()");
    } else {
      console.log("⚠️  Reverted but with unexpected error:", reason.slice(0, 100));
    }
  }

  // Try to withdraw — should revert with WithdrawalsClosed
  console.log("\n🔒 Attempting withdrawal during lock period...");
  try {
    await market1.connect(alice).withdraw(0, ethers.parseUnits("100", 6));
    console.log("❌ ERROR: Withdrawal succeeded but should have reverted!");
  } catch (err: any) {
    const reason = err.message || "";
    if (reason.includes("WithdrawalsClosed")) {
      console.log("✅ Correctly reverted with WithdrawalsClosed()");
    } else {
      console.log("⚠️  Reverted but with unexpected error:", reason.slice(0, 100));
    }
  }

  console.log("\n── TEST 1 COMPLETE ──");
  console.log("Frontend verification needed:");
  console.log("  1. UrgencyBanner should show 'Pool Locked — Deposits Closed'");
  console.log("  2. TradePanel input should be disabled with 'LOCKED' placeholder");
  console.log("  3. Action button should show 'POOL LOCKED' and be disabled");
  console.log(`  4. Market address: ${market1Addr}\n`);

  // ═══════════════════════════════════════════
  // TEST 2: Zero-Winner Fallback
  // ═══════════════════════════════════════════
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  TEST 2: ZERO-WINNER FALLBACK                   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Get fresh timestamp after the warp
  const block2 = await ethers.provider.getBlock("latest");
  const now2 = block2!.timestamp;
  const resolutionTime2 = now2 + THREE_DAYS;

  // Create market with ZERO seed — ensures YES pool starts at 0
  const tx2 = await factory.createMarket(
    "Will Clawd beat AIXBT in Epoch 24?",
    2, // HEAD_TO_HEAD
    usdcAddr,
    resolutionTime2,
    0 // No seed — both pools start at 0
  );
  await tx2.wait();
  const allMarkets2 = await factory.getMarkets();
  const market2Addr = allMarkets2[allMarkets2.length - 1];
  console.log("Market 2 created:", market2Addr);

  const market2 = await ethers.getContractAt("ParimutuelMarket", market2Addr);

  // Bet ONLY on NO (outcome 1). YES pool stays at 0.
  const BIG_BET = ethers.parseUnits("50000", 6);
  await usdc.connect(alice).approve(market2Addr, BIG_BET);
  await market2.connect(alice).bet(1, BIG_BET); // NO
  console.log("✅ Alice bet 50,000 USDC on NO");

  await usdc.connect(bob).approve(market2Addr, BIG_BET);
  await market2.connect(bob).bet(1, BIG_BET); // NO
  console.log("✅ Bob bet 50,000 USDC on NO");

  const poolYes2 = await market2.poolYes();
  const poolNo2 = await market2.poolNo();
  const totalPool2 = await market2.totalPool();
  console.log(`\nPool state: YES=${ethers.formatUnits(poolYes2, 6)}, NO=${ethers.formatUnits(poolNo2, 6)}, Total=${ethers.formatUnits(totalPool2, 6)}`);
  console.log(`YES pool is ${poolYes2 === 0n ? "✅ ZERO" : "❌ NOT ZERO"} — zero-winner scenario ready`);

  // Fast-forward past resolution
  console.log(`\n⏩ Fast-forwarding ${THREE_DAYS + 100} seconds past resolution...`);
  await ethers.provider.send("evm_increaseTime", [THREE_DAYS + 100]);
  await ethers.provider.send("evm_mine", []);

  // Resolve as YES winner (outcome 1) — the side with ZERO bets
  // Use emergencyResolve to bypass the timelock for testing
  console.log("Resolving market as YES winner (the empty pool)...");
  await oracle.emergencyResolve(market2Addr, 1); // Yes = 1
  console.log("✅ Market resolved: YES wins");

  const finalPoolYes = await market2.poolYes();
  const finalPoolNo = await market2.poolNo();
  const finalOutcome = await market2.outcome();
  console.log(`Final state: outcome=${finalOutcome}, poolYes=${ethers.formatUnits(finalPoolYes, 6)}, poolNo=${ethers.formatUnits(finalPoolNo, 6)}`);

  // Try normal redeem for Alice (NO bettor) — should fail
  console.log("\n🔒 Alice trying normal redeem()...");
  try {
    await market2.connect(alice).redeem();
    console.log("❌ ERROR: Normal redeem succeeded — unexpected!");
  } catch (err: any) {
    const reason = err.message || "";
    if (reason.includes("NothingToRedeem")) {
      console.log("✅ Correctly reverted with NothingToRedeem() — Alice holds NO tokens, not the winning YES");
    } else {
      console.log("⚠️  Reverted:", reason.slice(0, 120));
    }
  }

  // Use fallback for Alice
  console.log("\n💰 Alice trying redeemZeroWinnerFallback()...");
  try {
    const balBefore = await usdc.balanceOf(alice.address);
    const tx = await market2.connect(alice).redeemZeroWinnerFallback();
    const receipt = await tx.wait();
    const balAfter = await usdc.balanceOf(alice.address);
    const payout = balAfter - balBefore;
    console.log(`✅ Fallback succeeded! Alice received ${ethers.formatUnits(payout, 6)} USDC`);
    console.log(`   (Original bet: 50,000 USDC, Payout after 2% fee: ${ethers.formatUnits(payout, 6)} USDC)`);
  } catch (err: any) {
    console.log("❌ Fallback failed:", err.message?.slice(0, 150));
  }

  // Use fallback for Bob
  console.log("\n💰 Bob trying redeemZeroWinnerFallback()...");
  try {
    const balBefore = await usdc.balanceOf(bob.address);
    const tx = await market2.connect(bob).redeemZeroWinnerFallback();
    await tx.wait();
    const balAfter = await usdc.balanceOf(bob.address);
    const payout = balAfter - balBefore;
    console.log(`✅ Fallback succeeded! Bob received ${ethers.formatUnits(payout, 6)} USDC`);
  } catch (err: any) {
    console.log("❌ Fallback failed:", err.message?.slice(0, 150));
  }

  console.log("\n── TEST 2 COMPLETE ──");
  console.log("Frontend verification needed:");
  console.log("  1. Portfolio page should show 'Redeem (Fallback)' button for Alice/Bob");
  console.log("  2. TradePanel on resolved market should show REDEEM (FALLBACK) button");
  console.log("  3. Normal REDEEM WINNINGS should NOT appear (zero-winner case)");
  console.log(`  4. Market address: ${market2Addr}\n`);

  // ═══════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║                   SUMMARY                       ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(".env values for frontend:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${usdcAddr}`);
  console.log(`NEXT_PUBLIC_ORACLE_ADDRESS=${await oracle.getAddress()}`);
  console.log(`NEXT_PUBLIC_FEE_ROUTER_ADDRESS=${await feeRouter.getAddress()}`);
  console.log("\nMarket addresses:");
  const allFinal = await factory.getMarkets();
  allFinal.forEach((addr: string, i: number) => {
    console.log(`  Market ${i}: ${addr}`);
  });
  console.log("\n🏁 Gauntlet complete. Refresh your frontend to verify UI behavior.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
