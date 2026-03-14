import { ethers } from "hardhat";

async function main() {
  const recipient = process.env.RECIPIENT;
  if (!recipient) {
    // Default: mint to first 3 hardhat accounts + print their addresses
    const signers = await ethers.getSigners();
    const usdc = await ethers.getContractAt(
      "MockERC20",
      process.env.USDC_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    );

    const amount = ethers.parseUnits("100000", 6); // 100,000 USDC

    console.log("\n🏦 Minting 100,000 USDC to hardhat accounts...\n");
    for (let i = 0; i < Math.min(3, signers.length); i++) {
      const addr = await signers[i].getAddress();
      await usdc.mint(addr, amount);
      const bal = await usdc.balanceOf(addr);
      console.log(`  Account ${i}: ${addr}`);
      console.log(`  Balance: ${ethers.formatUnits(bal, 6)} USDC\n`);
    }

    console.log("─────────────────────────────────────────────");
    console.log("To mint to YOUR MetaMask wallet, run:");
    console.log('  $env:RECIPIENT="0xYourMetaMaskAddress"');
    console.log("  npx hardhat run scripts/mint-usdc.ts --network localhost");
    console.log("─────────────────────────────────────────────\n");
    return;
  }

  // Mint to specific recipient
  const usdc = await ethers.getContractAt(
    "MockERC20",
    process.env.USDC_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const amount = ethers.parseUnits("100000", 6); // 100,000 USDC
  console.log(`\n🏦 Minting 100,000 USDC to ${recipient}...`);
  await usdc.mint(recipient, amount);
  const bal = await usdc.balanceOf(recipient);
  console.log(`✅ Done! Balance: ${ethers.formatUnits(bal, 6)} USDC\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
