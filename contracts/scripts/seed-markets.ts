import { ethers } from "hardhat";

// Update these addresses after running deploy.ts
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "";
const USDC_ADDRESS = process.env.USDC_ADDRESS || "";

// Fetch the current active epoch from the Virtuals Protocol API
async function getCurrentEpoch(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.virtuals.io/api/agdp-leaderboard-epochs?sort=epochNumber:desc&pagination[pageSize]=1"
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const epoch = json?.data?.[0]?.attributes?.epochNumber;
    if (typeof epoch === "number") return epoch;
    throw new Error("Epoch number not found in response");
  } catch (err) {
    console.warn("  Failed to fetch live epoch from Virtuals API, trying local API...");
    try {
      const localRes = await fetch("http://localhost:3001/api/leaderboard");
      if (!localRes.ok) throw new Error(`HTTP ${localRes.status}`);
      const localJson = await localRes.json();
      if (localJson?.epochInfo?.epochNumber) return localJson.epochInfo.epochNumber;
    } catch {
      // ignore
    }
    console.warn("  Could not reach any API. Using epoch 0 as placeholder.");
    return 0;
  }
}

async function main() {
  if (!FACTORY_ADDRESS || !USDC_ADDRESS) {
    console.error("Set FACTORY_ADDRESS and USDC_ADDRESS environment variables");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Seeding markets with:", deployer.address);

  const factory = await ethers.getContractAt("MarketFactory", FACTORY_ADDRESS);
  const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);

  const USDC_SEED = ethers.parseUnits("10000", 6); // 10k USDC seed per market
  const ONE_WEEK = 7 * 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  const resolutionTime = now + ONE_WEEK;

  // Fetch current epoch dynamically
  const epoch = await getCurrentEpoch();
  const epochLabel = epoch > 0 ? `Epoch ${epoch}` : "this Epoch";
  console.log(`\nUsing epoch: ${epochLabel}\n`);

  // --- USDC Markets ---
  const markets = [
    {
      question: `Will Ethy be #1 on the aGDP leaderboard at the end of ${epochLabel}?`,
      type: 0, // EPOCH_WINNER
    },
    {
      question: `Will Clawd finish in the Top 10 for ${epochLabel}?`,
      type: 1, // TOP_10
    },
    {
      question: `Will Ethy rank higher than Clawd in ${epochLabel}?`,
      type: 2, // HEAD_TO_HEAD
    },
    {
      question: `Will any agent outside the Top 50 break into the Top 10 in ${epochLabel}?`,
      type: 3, // LONG_TAIL
    },
  ];

  console.log("=== Creating USDC Markets (Parimutuel) ===");
  for (const m of markets) {
    console.log(`\nCreating market: "${m.question}"`);
    await usdc.approve(FACTORY_ADDRESS, USDC_SEED);
    const tx = await factory.createMarket(
      m.question,
      m.type,
      USDC_ADDRESS,
      resolutionTime,
      USDC_SEED
    );
    const receipt = await tx.wait();
    console.log(`  TX: ${receipt?.hash}`);
  }

  // --- Summary ---
  const marketCount = await factory.getMarketCount();
  console.log(`\nTotal markets created: ${marketCount}`);

  const allMarkets = await factory.getMarkets();
  allMarkets.forEach((addr: string, i: number) => {
    console.log(`  Market ${i}: ${addr}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
