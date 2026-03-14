import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // --- Configuration ---
  const TIMELOCK_DURATION = 3600; // 1 hour
  const DEFAULT_REDEMPTION_FEE_BPS = 500; // 5% fee on winning payouts
  const DEFAULT_WITHDRAWAL_FEE_BPS = 500; // 5% penalty on early withdrawal
  const TREASURY_SPLIT_BPS = 5000; // 50%

  // Use existing USDC contracts — no mock deployment needed
  const chainId = (await ethers.provider.getNetwork()).chainId;
  let usdcAddress: string;

  if (chainId === 8453n) {
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base mainnet
  } else if (chainId === 84532n) {
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia (Circle)
  } else {
    // Local hardhat — deploy mock
    console.log("\n--- Deploying Mock USDC (local) ---");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
    console.log("MockUSDC deployed to:", usdcAddress);
  }
  console.log("Using USDC:", usdcAddress);

  // --- Deploy AGDPOracle ---
  console.log("\n--- Deploying AGDPOracle ---");
  const AGDPOracle = await ethers.getContractFactory("AGDPOracle");
  const oracle = await AGDPOracle.deploy(deployer.address, TIMELOCK_DURATION);
  await oracle.waitForDeployment();
  console.log("AGDPOracle deployed to:", await oracle.getAddress());

  // --- Deploy FeeRouter ---
  console.log("\n--- Deploying FeeRouter ---");
  const FeeRouter = await ethers.getContractFactory("FeeRouter");
  const feeRouter = await FeeRouter.deploy(deployer.address, TREASURY_SPLIT_BPS);
  await feeRouter.waitForDeployment();
  console.log("FeeRouter deployed to:", await feeRouter.getAddress());

  // --- Deploy MarketFactory ---
  console.log("\n--- Deploying MarketFactory ---");
  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const factory = await MarketFactory.deploy(
    await oracle.getAddress(),
    await feeRouter.getAddress(),
    DEFAULT_REDEMPTION_FEE_BPS,
    DEFAULT_WITHDRAWAL_FEE_BPS
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("MarketFactory deployed to:", factoryAddress);

  // --- Post-deploy setup ---
  console.log("\n--- Post-deploy setup ---");

  // Whitelist USDC as the only collateral for MVP
  await factory.addCollateral(usdcAddress);
  console.log("Whitelisted USDC as collateral");

  // --- Summary ---
  console.log("\n========================================");
  console.log("Deployment Summary (Parimutuel — USDC Only):");
  console.log("========================================");
  console.log("USDC:            ", usdcAddress);
  console.log("AGDPOracle:      ", await oracle.getAddress());
  console.log("FeeRouter:       ", await feeRouter.getAddress());
  console.log("MarketFactory:   ", factoryAddress);
  console.log("========================================");
  console.log("Redemption Fee:  ", DEFAULT_REDEMPTION_FEE_BPS, `bps (${DEFAULT_REDEMPTION_FEE_BPS / 100}%)`);
  console.log("Withdrawal Fee:  ", DEFAULT_WITHDRAWAL_FEE_BPS, `bps (${DEFAULT_WITHDRAWAL_FEE_BPS / 100}%)`);
  console.log("Timelock:        ", TIMELOCK_DURATION, "seconds (1 hour)");
  console.log("Treasury Split:  ", TREASURY_SPLIT_BPS, "bps (50%)");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
