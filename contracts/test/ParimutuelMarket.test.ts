import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ParimutuelMarket, MarketFactory, AGDPOracle, FeeRouter, OutcomeToken } from "../typechain-types";

describe("AGDPBet — Parimutuel", function () {
  async function deployFixture() {
    const [owner, resolver, trader1, trader2, treasury] = await ethers.getSigners();

    // Deploy mock USDC (6 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    // Mint USDC to users
    const INITIAL_BALANCE = ethers.parseUnits("100000", 6);
    await usdc.mint(owner.address, INITIAL_BALANCE);
    await usdc.mint(trader1.address, INITIAL_BALANCE);
    await usdc.mint(trader2.address, INITIAL_BALANCE);

    // Deploy Oracle (1 hour timelock)
    const oracleFactory = await ethers.getContractFactory("AGDPOracle");
    const oracle = await oracleFactory.deploy(resolver.address, 3600);

    // Deploy FeeRouter (50/50 split)
    const feeRouterFactory = await ethers.getContractFactory("FeeRouter");
    const feeRouter = await feeRouterFactory.deploy(treasury.address, 5000);

    // Deploy MarketFactory (2% redemption fee, 5% withdrawal penalty)
    const marketFactoryFactory = await ethers.getContractFactory("MarketFactory");
    const factory = await marketFactoryFactory.deploy(
      await oracle.getAddress(),
      await feeRouter.getAddress(),
      200, // 2% redemption fee
      500  // 5% withdrawal penalty
    );

    // Create a market with seed bet
    const resolutionTime = (await time.latest()) + 7 * 24 * 60 * 60; // 1 week
    const seedAmount = ethers.parseUnits("10000", 6); // 10k USDC seed

    await usdc.connect(owner).approve(await factory.getAddress(), seedAmount);

    await factory.createMarket(
      "Will Agent X be Top 10 in Epoch 22?",
      1, // TOP_10
      await usdc.getAddress(),
      resolutionTime,
      seedAmount
    );

    const marketAddress = await factory.markets(0);
    const market = await ethers.getContractAt("ParimutuelMarket", marketAddress) as ParimutuelMarket;

    const yesTokenAddress = await market.yesToken();
    const noTokenAddress = await market.noToken();
    const yesToken = await ethers.getContractAt("OutcomeToken", yesTokenAddress) as OutcomeToken;
    const noToken = await ethers.getContractAt("OutcomeToken", noTokenAddress) as OutcomeToken;

    return {
      owner, resolver, trader1, trader2, treasury,
      usdc, oracle, feeRouter, factory, market,
      yesToken, noToken,
      resolutionTime, seedAmount
    };
  }

  // Fixture with no seed for testing empty markets
  async function deployNoSeedFixture() {
    const [owner, resolver, trader1, trader2, treasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    const INITIAL_BALANCE = ethers.parseUnits("100000", 6);
    await usdc.mint(owner.address, INITIAL_BALANCE);
    await usdc.mint(trader1.address, INITIAL_BALANCE);
    await usdc.mint(trader2.address, INITIAL_BALANCE);

    const oracleFactory = await ethers.getContractFactory("AGDPOracle");
    const oracle = await oracleFactory.deploy(resolver.address, 3600);

    const feeRouterFactory = await ethers.getContractFactory("FeeRouter");
    const feeRouter = await feeRouterFactory.deploy(treasury.address, 5000);

    const marketFactoryFactory = await ethers.getContractFactory("MarketFactory");
    const factory = await marketFactoryFactory.deploy(
      await oracle.getAddress(),
      await feeRouter.getAddress(),
      200, 500
    );

    const resolutionTime = (await time.latest()) + 7 * 24 * 60 * 60;

    // Create market with 0 seed
    await factory.createMarket(
      "Will Agent Y win Epoch 23?",
      0, // EPOCH_WINNER
      await usdc.getAddress(),
      resolutionTime,
      0 // no seed
    );

    const marketAddress = await factory.markets(0);
    const market = await ethers.getContractAt("ParimutuelMarket", marketAddress) as ParimutuelMarket;
    const yesToken = await ethers.getContractAt("OutcomeToken", await market.yesToken()) as OutcomeToken;
    const noToken = await ethers.getContractAt("OutcomeToken", await market.noToken()) as OutcomeToken;

    return { owner, resolver, trader1, trader2, treasury, usdc, oracle, feeRouter, factory, market, yesToken, noToken, resolutionTime };
  }

  describe("Deployment & Initialization", function () {
    it("should deploy all contracts", async function () {
      const { factory, oracle, feeRouter } = await loadFixture(deployFixture);
      expect(await factory.getAddress()).to.be.properAddress;
      expect(await oracle.getAddress()).to.be.properAddress;
      expect(await feeRouter.getAddress()).to.be.properAddress;
    });

    it("should create a market with correct parameters", async function () {
      const { market, usdc, oracle, resolutionTime } = await loadFixture(deployFixture);

      expect(await market.question()).to.equal("Will Agent X be Top 10 in Epoch 22?");
      expect(await market.marketType()).to.equal(1);
      expect(await market.collateralToken()).to.equal(await usdc.getAddress());
      expect(await market.oracle()).to.equal(await oracle.getAddress());
      expect(await market.resolutionTime()).to.equal(resolutionTime);
      expect(await market.redemptionFeeBps()).to.equal(200);
      expect(await market.withdrawalFeeBps()).to.equal(500);
      expect(await market.bettingLockPeriod()).to.equal(2 * 3600); // 2 hours
      expect(await market.initialized()).to.be.true;
      expect(await market.resolved()).to.be.false;
    });

    it("should split seed equally into YES and NO pools", async function () {
      const { market, seedAmount } = await loadFixture(deployFixture);
      const halfSeed = seedAmount / 2n;

      expect(await market.poolYes()).to.equal(halfSeed);
      expect(await market.poolNo()).to.equal(seedAmount - halfSeed);
      expect(await market.totalPool()).to.equal(seedAmount);
    });

    it("should mint seed outcome tokens to creator", async function () {
      const { owner, yesToken, noToken, seedAmount } = await loadFixture(deployFixture);
      const halfSeed = seedAmount / 2n;

      expect(await yesToken.balanceOf(owner.address)).to.equal(halfSeed);
      expect(await noToken.balanceOf(owner.address)).to.equal(seedAmount - halfSeed);
    });

    it("should start with 50/50 prices when seeded equally", async function () {
      const { market } = await loadFixture(deployFixture);

      expect(await market.priceYes()).to.equal(ethers.parseEther("0.5"));
      expect(await market.priceNo()).to.equal(ethers.parseEther("0.5"));
    });

    it("should start with 50/50 prices when pool is empty", async function () {
      const { market } = await loadFixture(deployNoSeedFixture);

      expect(await market.priceYes()).to.equal(ethers.parseEther("0.5"));
      expect(await market.priceNo()).to.equal(ethers.parseEther("0.5"));
    });

    it("should allow creating market with zero seed", async function () {
      const { market } = await loadFixture(deployNoSeedFixture);

      expect(await market.poolYes()).to.equal(0);
      expect(await market.poolNo()).to.equal(0);
      expect(await market.totalPool()).to.equal(0);
      expect(await market.initialized()).to.be.true;
    });

    it("should track markets in factory", async function () {
      const { factory, market } = await loadFixture(deployFixture);

      expect(await factory.getMarketCount()).to.equal(1);
      expect(await factory.markets(0)).to.equal(await market.getAddress());
      expect(await factory.isMarket(await market.getAddress())).to.be.true;
    });
  });

  describe("Betting", function () {
    it("should place YES bet and mint tokens 1:1", async function () {
      const { market, usdc, yesToken, trader1 } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      expect(await yesToken.balanceOf(trader1.address)).to.equal(betAmount);
    });

    it("should place NO bet and mint tokens 1:1", async function () {
      const { market, usdc, noToken, trader1 } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(1, betAmount);

      expect(await noToken.balanceOf(trader1.address)).to.equal(betAmount);
    });

    it("should increase pool and shift prices after YES bet", async function () {
      const { market, usdc, trader1, seedAmount } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("2000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      expect(await market.poolYes()).to.equal(seedAmount / 2n + betAmount);
      expect(await market.totalPool()).to.equal(seedAmount + betAmount);

      const priceYes = await market.priceYes();
      expect(priceYes).to.be.gt(ethers.parseEther("0.5"));
    });

    it("should handle multiple bets from different traders", async function () {
      const { market, usdc, yesToken, noToken, trader1, trader2 } = await loadFixture(deployFixture);

      const bet1 = ethers.parseUnits("2000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet1);
      await market.connect(trader1).bet(0, bet1);

      const bet2 = ethers.parseUnits("1000", 6);
      await usdc.connect(trader2).approve(await market.getAddress(), bet2);
      await market.connect(trader2).bet(1, bet2);

      expect(await yesToken.balanceOf(trader1.address)).to.equal(bet1);
      expect(await noToken.balanceOf(trader2.address)).to.equal(bet2);

      const priceYes = await market.priceYes();
      const priceNo = await market.priceNo();
      expect(priceYes).to.be.gt(priceNo);
    });

    it("should revert on zero amount", async function () {
      const { market, trader1 } = await loadFixture(deployFixture);

      await expect(
        market.connect(trader1).bet(0, 0)
      ).to.be.revertedWithCustomError(market, "ZeroAmount");
    });

    it("should revert on invalid outcome index", async function () {
      const { market, usdc, trader1 } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);

      await expect(
        market.connect(trader1).bet(2, betAmount)
      ).to.be.revertedWithCustomError(market, "InvalidOutcomeIndex");
    });

    it("should not allow betting after resolution time", async function () {
      const { market, usdc, trader1, resolutionTime } = await loadFixture(deployFixture);

      await time.increaseTo(resolutionTime + 1);

      const betAmount = ethers.parseUnits("100", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);

      await expect(
        market.connect(trader1).bet(0, betAmount)
      ).to.be.revertedWithCustomError(market, "MarketNotActive");
    });

    it("should not allow betting during lock period (2h before resolution)", async function () {
      const { market, usdc, trader1, resolutionTime } = await loadFixture(deployFixture);

      // Move to 1 hour before resolution (within 2h lock)
      await time.increaseTo(resolutionTime - 3600);

      const betAmount = ethers.parseUnits("100", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);

      await expect(
        market.connect(trader1).bet(0, betAmount)
      ).to.be.revertedWithCustomError(market, "BettingLocked");
    });

    it("should not accumulate fees on bet (fees on payout only)", async function () {
      const { market, usdc, trader1 } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      expect(await market.accumulatedFees()).to.equal(0);
    });
  });

  describe("Withdrawal", function () {
    it("should withdraw with penalty — penalty stays in pool", async function () {
      const { market, usdc, yesToken, trader1 } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      const poolYesBefore = await market.poolYes();
      const totalPoolBefore = await market.totalPool();

      const usdcBefore = await usdc.balanceOf(trader1.address);
      await market.connect(trader1).withdraw(0, betAmount);
      const usdcAfter = await usdc.balanceOf(trader1.address);

      // 5% penalty: 1000 * 500/10000 = 50 USDC
      const expectedPenalty = ethers.parseUnits("50", 6);
      const expectedRefund = betAmount - expectedPenalty;

      // User receives refund minus penalty
      expect(usdcAfter - usdcBefore).to.equal(expectedRefund);
      // Tokens burned
      expect(await yesToken.balanceOf(trader1.address)).to.equal(0);
      // Penalty stays in pool (NOT in accumulatedFees)
      expect(await market.accumulatedFees()).to.equal(0);
      // Pool decreases only by refund amount (penalty stays)
      expect(await market.poolYes()).to.equal(poolYesBefore - expectedRefund);
      expect(await market.totalPool()).to.equal(totalPoolBefore - expectedRefund);
    });

    it("should keep withdrawal penalty in pool for remaining bettors", async function () {
      const { market, usdc, oracle, resolver, trader1, trader2, resolutionTime } =
        await loadFixture(deployNoSeedFixture);

      // Trader1 bets 1000 YES, Trader2 bets 1000 NO
      const bet = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet);
      await market.connect(trader1).bet(0, bet);
      await usdc.connect(trader2).approve(await market.getAddress(), bet);
      await market.connect(trader2).bet(1, bet);

      // totalPool = 2000, poolYes = 1000, poolNo = 1000

      // Trader1 withdraws all YES tokens (500 penalty stays in pool)
      await market.connect(trader1).withdraw(0, bet);

      // After withdrawal: penalty = 50 (5% of 1000), refund = 950
      // poolYes = 1000 - 950 = 50 (penalty stays in YES pool)
      // totalPool = 2000 - 950 = 1050
      expect(await market.poolYes()).to.equal(ethers.parseUnits("50", 6));
      expect(await market.poolNo()).to.equal(bet); // unchanged
      expect(await market.totalPool()).to.equal(ethers.parseUnits("1050", 6));

      // Resolve as NO — trader2 wins
      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 2); // NO
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      // Trader2 payout: 1000 * 1050 / 1000 = 1050 gross (penalty boosted their payout)
      const totalPool = await market.totalPool();
      const poolNo = await market.poolNo();
      const grossPayout = (bet * totalPool) / poolNo;
      const fee = (grossPayout * 200n) / 10000n;
      const expectedNet = grossPayout - fee;

      const t2Before = await usdc.balanceOf(trader2.address);
      await market.connect(trader2).redeem();
      const t2After = await usdc.balanceOf(trader2.address);

      expect(t2After - t2Before).to.equal(expectedNet);
      // The 50 penalty went to trader2 as bonus (minus fee)
    });

    it("should not allow withdrawal during lock period", async function () {
      const { market, usdc, trader1, resolutionTime } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      // Move to within 2h lock period
      await time.increaseTo(resolutionTime - 3600);

      await expect(
        market.connect(trader1).withdraw(0, betAmount)
      ).to.be.revertedWithCustomError(market, "WithdrawalsClosed");
    });

    it("should not allow withdrawal after resolution time", async function () {
      const { market, usdc, trader1, resolutionTime } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      await time.increaseTo(resolutionTime + 1);

      await expect(
        market.connect(trader1).withdraw(0, betAmount)
      ).to.be.revertedWithCustomError(market, "WithdrawalsClosed");
    });

    it("should not allow withdrawal after resolution", async function () {
      const { market, usdc, oracle, resolver, trader1, resolutionTime } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      // Resolve
      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      await expect(
        market.connect(trader1).withdraw(0, betAmount)
      ).to.be.revertedWithCustomError(market, "WithdrawalsClosed");
    });

    it("calcWithdrawal should match actual withdrawal", async function () {
      const { market, usdc, trader1 } = await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      const [expectedRefund, expectedPenalty] = await market.calcWithdrawal(betAmount);

      const usdcBefore = await usdc.balanceOf(trader1.address);
      await market.connect(trader1).withdraw(0, betAmount);
      const usdcAfter = await usdc.balanceOf(trader1.address);

      expect(usdcAfter - usdcBefore).to.equal(expectedRefund);
      // Penalty stays in pool, not accumulatedFees
      expect(await market.accumulatedFees()).to.equal(0);
    });
  });

  describe("Resolution", function () {
    it("should resolve market as YES via oracle", async function () {
      const { market, oracle, resolver, resolutionTime } = await loadFixture(deployFixture);

      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      expect(await market.resolved()).to.be.true;
      expect(await market.outcome()).to.equal(1);
    });

    it("should not resolve before resolution time", async function () {
      const { market, oracle, resolver } = await loadFixture(deployFixture);

      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);

      await expect(
        oracle.connect(resolver).finalizeResolution(await market.getAddress())
      ).to.be.revertedWithCustomError(market, "TooEarlyToResolve");
    });

    it("should not allow non-oracle to resolve", async function () {
      const { market, trader1, resolutionTime } = await loadFixture(deployFixture);

      await time.increaseTo(resolutionTime + 1);

      await expect(
        market.connect(trader1).resolve(1)
      ).to.be.revertedWithCustomError(market, "NotOracle");
    });
  });

  describe("Redemption — Parimutuel", function () {
    it("should pay winners proportional share of total pool", async function () {
      const { market, usdc, oracle, resolver, trader1, trader2, resolutionTime, seedAmount } =
        await loadFixture(deployFixture);

      const bet1 = ethers.parseUnits("2000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet1);
      await market.connect(trader1).bet(0, bet1);

      const bet2 = ethers.parseUnits("1000", 6);
      await usdc.connect(trader2).approve(await market.getAddress(), bet2);
      await market.connect(trader2).bet(1, bet2);

      // Resolve as YES
      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      const totalPool = await market.totalPool();
      const poolYes = await market.poolYes();

      const usdcBefore = await usdc.balanceOf(trader1.address);
      await market.connect(trader1).redeem();
      const usdcAfter = await usdc.balanceOf(trader1.address);

      const grossPayout = (bet1 * totalPool) / poolYes;
      const fee = (grossPayout * 200n) / 10000n;
      const expectedPayout = grossPayout - fee;

      expect(usdcAfter - usdcBefore).to.equal(expectedPayout);
    });

    it("should not let losers redeem", async function () {
      const { market, usdc, oracle, resolver, trader1, resolutionTime } =
        await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(1, betAmount);

      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      await expect(
        market.connect(trader1).redeem()
      ).to.be.revertedWithCustomError(market, "NothingToRedeem");
    });

    it("should split pool proportionally between multiple winners", async function () {
      const { market, usdc, oracle, resolver, trader1, trader2, resolutionTime } =
        await loadFixture(deployNoSeedFixture);

      const bet1 = ethers.parseUnits("600", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet1);
      await market.connect(trader1).bet(0, bet1);

      const bet2 = ethers.parseUnits("400", 6);
      await usdc.connect(trader2).approve(await market.getAddress(), bet2);
      await market.connect(trader2).bet(0, bet2);

      const [owner] = await ethers.getSigners();
      const bet3 = ethers.parseUnits("500", 6);
      await usdc.connect(owner).approve(await market.getAddress(), bet3);
      await market.connect(owner).bet(1, bet3);

      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      const totalPool = await market.totalPool();
      const poolYes = await market.poolYes();

      const t1Before = await usdc.balanceOf(trader1.address);
      await market.connect(trader1).redeem();
      const t1After = await usdc.balanceOf(trader1.address);

      const gross1 = (bet1 * totalPool) / poolYes;
      const fee1 = (gross1 * 200n) / 10000n;
      expect(t1After - t1Before).to.equal(gross1 - fee1);

      const t2Before = await usdc.balanceOf(trader2.address);
      await market.connect(trader2).redeem();
      const t2After = await usdc.balanceOf(trader2.address);

      const gross2 = (bet2 * totalPool) / poolYes;
      const fee2 = (gross2 * 200n) / 10000n;
      expect(t2After - t2Before).to.equal(gross2 - fee2);
    });

    it("should refund all bets on Invalid outcome minus fee", async function () {
      const { market, usdc, yesToken, noToken, oracle, resolver, trader1, resolutionTime } =
        await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(1, betAmount);

      // Resolve as Invalid (outcome = 3)
      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 3);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      const yesBal = await yesToken.balanceOf(trader1.address);
      const noBal = await noToken.balanceOf(trader1.address);
      const totalBet = yesBal + noBal;
      const fee = (totalBet * 200n) / 10000n;

      const usdcBefore = await usdc.balanceOf(trader1.address);
      await market.connect(trader1).redeem();
      const usdcAfter = await usdc.balanceOf(trader1.address);

      expect(usdcAfter - usdcBefore).to.equal(totalBet - fee);
    });

    it("should refund all bets on Tie outcome minus fee", async function () {
      const { market, usdc, yesToken, noToken, oracle, owner, trader1, resolutionTime } =
        await loadFixture(deployFixture);

      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(0, betAmount);

      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(1, betAmount);

      // Resolve as Tie (outcome = 4) via emergency (only owner can do it)
      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(owner).emergencyResolve(await market.getAddress(), 4);

      const yesBal = await yesToken.balanceOf(trader1.address);
      const noBal = await noToken.balanceOf(trader1.address);
      const totalBet = yesBal + noBal;
      const fee = (totalBet * 200n) / 10000n;

      const usdcBefore = await usdc.balanceOf(trader1.address);
      await market.connect(trader1).redeem();
      const usdcAfter = await usdc.balanceOf(trader1.address);

      expect(usdcAfter - usdcBefore).to.equal(totalBet - fee);
    });

    it("should not redeem before resolution", async function () {
      const { market, trader1 } = await loadFixture(deployFixture);

      await expect(
        market.connect(trader1).redeem()
      ).to.be.revertedWithCustomError(market, "MarketNotResolved");
    });

    it("should accumulate redemption fees", async function () {
      const { market, usdc, oracle, resolver, trader1, resolutionTime } =
        await loadFixture(deployNoSeedFixture);

      const bet1 = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet1);
      await market.connect(trader1).bet(0, bet1);

      const bet2 = ethers.parseUnits("500", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet2);
      await market.connect(trader1).bet(1, bet2);

      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      await market.connect(trader1).redeem();

      // gross = 1000 * 1500 / 1000 = 1500, fee = 1500 * 200 / 10000 = 30
      expect(await market.accumulatedFees()).to.equal(ethers.parseUnits("30", 6));
    });
  });

  describe("Zero-Winner Fallback", function () {
    it("should refund losers when winning side has zero pool", async function () {
      const { market, usdc, oracle, resolver, trader1, resolutionTime } =
        await loadFixture(deployNoSeedFixture);

      // Only bet on NO side
      const betAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);
      await market.connect(trader1).bet(1, betAmount); // NO

      // poolYes = 0, poolNo = 1000
      expect(await market.poolYes()).to.equal(0);

      // Resolve as YES (winning side has 0 bets!)
      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1); // YES
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      // Normal redeem should fail (trader holds NO tokens, YES won)
      await expect(
        market.connect(trader1).redeem()
      ).to.be.revertedWithCustomError(market, "NothingToRedeem");

      // Use zero-winner fallback to get refund
      const fee = (betAmount * 200n) / 10000n; // 2%
      const expectedPayout = betAmount - fee;

      const usdcBefore = await usdc.balanceOf(trader1.address);
      await market.connect(trader1).redeemZeroWinnerFallback();
      const usdcAfter = await usdc.balanceOf(trader1.address);

      expect(usdcAfter - usdcBefore).to.equal(expectedPayout);
    });

    it("should not allow fallback when winning side has bets", async function () {
      const { market, usdc, oracle, resolver, trader1, trader2, resolutionTime } =
        await loadFixture(deployNoSeedFixture);

      const bet = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet);
      await market.connect(trader1).bet(0, bet);
      await usdc.connect(trader2).approve(await market.getAddress(), bet);
      await market.connect(trader2).bet(1, bet);

      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      // Fallback should fail since winning side (YES) has bets
      await expect(
        market.connect(trader2).redeemZeroWinnerFallback()
      ).to.be.revertedWith("Use redeem() when winning side has bets");
    });
  });

  describe("Fee Withdrawal", function () {
    it("should transfer accumulated fees to fee router", async function () {
      const { market, usdc, oracle, resolver, trader1, feeRouter, resolutionTime } =
        await loadFixture(deployNoSeedFixture);

      const bet1 = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet1);
      await market.connect(trader1).bet(0, bet1);

      const bet2 = ethers.parseUnits("500", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet2);
      await market.connect(trader1).bet(1, bet2);

      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      await market.connect(trader1).redeem();

      const fees = await market.accumulatedFees();
      expect(fees).to.be.gt(0);

      const routerBefore = await usdc.balanceOf(await feeRouter.getAddress());
      await market.withdrawFees();
      const routerAfter = await usdc.balanceOf(await feeRouter.getAddress());

      expect(routerAfter - routerBefore).to.equal(fees);
      expect(await market.accumulatedFees()).to.equal(0);
    });
  });

  describe("Lock Period", function () {
    it("isLocked should return true during lock period", async function () {
      const { market, resolutionTime } = await loadFixture(deployFixture);

      // Before lock period
      expect(await market.isLocked()).to.be.false;

      // Move to within lock period (1 hour before resolution = within 2h lock)
      await time.increaseTo(resolutionTime - 3600);
      expect(await market.isLocked()).to.be.true;
    });

    it("should allow betting just before lock period starts", async function () {
      const { market, usdc, trader1, resolutionTime } = await loadFixture(deployFixture);

      // Move to 2h + 10s before resolution (just outside lock)
      await time.increaseTo(resolutionTime - 2 * 3600 - 10);

      const betAmount = ethers.parseUnits("100", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), betAmount);

      // Should succeed
      await expect(
        market.connect(trader1).bet(0, betAmount)
      ).to.not.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("calcPayout should estimate correct payout", async function () {
      const { market, usdc, trader1, trader2 } = await loadFixture(deployNoSeedFixture);

      const bet1 = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet1);
      await market.connect(trader1).bet(0, bet1);

      const bet2 = ethers.parseUnits("500", 6);
      await usdc.connect(trader2).approve(await market.getAddress(), bet2);
      await market.connect(trader2).bet(1, bet2);

      const payout = await market.calcPayout(0, bet1);
      const expectedGross = (bet1 * 1500000000n) / 1000000000n;
      const expectedFee = (expectedGross * 200n) / 10000n;
      expect(payout).to.equal(expectedGross - expectedFee);
    });

    it("payoutMultiplier should return correct multiplier", async function () {
      const { market, usdc, trader1, trader2 } = await loadFixture(deployNoSeedFixture);

      const bet1 = ethers.parseUnits("1000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet1);
      await market.connect(trader1).bet(0, bet1);

      const bet2 = ethers.parseUnits("500", 6);
      await usdc.connect(trader2).approve(await market.getAddress(), bet2);
      await market.connect(trader2).bet(1, bet2);

      const multiplier = await market.payoutMultiplier(0);
      expect(multiplier).to.equal(ethers.parseEther("1.5"));

      const noMultiplier = await market.payoutMultiplier(1);
      expect(noMultiplier).to.equal(ethers.parseEther("3"));
    });

    it("payoutMultiplier should return 0 for empty pool side", async function () {
      const { market } = await loadFixture(deployNoSeedFixture);

      expect(await market.payoutMultiplier(0)).to.equal(0);
      expect(await market.payoutMultiplier(1)).to.equal(0);
    });
  });

  describe("Oracle — Timelock", function () {
    it("should not finalize before timelock", async function () {
      const { market, oracle, resolver } = await loadFixture(deployFixture);

      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);

      await expect(
        oracle.connect(resolver).finalizeResolution(await market.getAddress())
      ).to.be.revertedWithCustomError(oracle, "TimelockNotExpired");
    });

    it("should allow owner to cancel pending resolution", async function () {
      const { market, oracle, owner, resolver } = await loadFixture(deployFixture);

      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1);
      await oracle.connect(owner).cancelResolution(await market.getAddress());

      const [, proposedAt] = await oracle.getResolutionStatus(await market.getAddress());
      expect(proposedAt).to.equal(0);
    });

    it("should allow emergency resolve by owner", async function () {
      const { market, oracle, owner, resolutionTime } = await loadFixture(deployFixture);

      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(owner).emergencyResolve(await market.getAddress(), 2);

      expect(await market.resolved()).to.be.true;
      expect(await market.outcome()).to.equal(2);
    });
  });

  describe("FeeRouter", function () {
    it("should accept and distribute fees", async function () {
      const { feeRouter, usdc, treasury, owner } = await loadFixture(deployFixture);

      const feeAmount = ethers.parseUnits("100", 6);
      await usdc.connect(owner).approve(await feeRouter.getAddress(), feeAmount);
      await feeRouter.receiveFees(await usdc.getAddress(), feeAmount);

      expect(await feeRouter.pendingFees(await usdc.getAddress())).to.equal(feeAmount);

      await feeRouter.distributeFees(await usdc.getAddress());

      expect(await usdc.balanceOf(treasury.address)).to.equal(ethers.parseUnits("50", 6));
      expect(await feeRouter.buybackPool(await usdc.getAddress())).to.equal(ethers.parseUnits("50", 6));
    });
  });

  describe("Full Lifecycle", function () {
    it("should handle complete: bet → withdraw → lock → resolve → redeem", async function () {
      const {
        market, usdc, yesToken, noToken,
        oracle, resolver,
        trader1, trader2, resolutionTime
      } = await loadFixture(deployNoSeedFixture);

      // --- Phase 1: Betting ---

      const bet1 = ethers.parseUnits("2000", 6);
      await usdc.connect(trader1).approve(await market.getAddress(), bet1);
      await market.connect(trader1).bet(0, bet1);

      const bet2 = ethers.parseUnits("1000", 6);
      await usdc.connect(trader2).approve(await market.getAddress(), bet2);
      await market.connect(trader2).bet(1, bet2);

      // Prices: YES = 2000/3000 = 66.7%, NO = 1000/3000 = 33.3%
      expect(await market.priceYes()).to.be.gt(await market.priceNo());

      // --- Phase 2: Partial withdrawal ---

      const withdrawAmount = ethers.parseUnits("500", 6);
      await market.connect(trader1).withdraw(0, withdrawAmount);

      // Penalty = 500 * 5% = 25 stays in pool
      // poolYes = 2000 - 475 = 1525 (tokens burned - penalty stays)
      const expectedRefund = withdrawAmount - (withdrawAmount * 500n) / 10000n; // 475
      expect(await market.poolYes()).to.equal(bet1 - expectedRefund);
      // totalPool = 3000 - 475 = 2525
      expect(await market.totalPool()).to.equal(bet1 + bet2 - expectedRefund);

      // Penalty stays in pool, not accumulatedFees
      expect(await market.accumulatedFees()).to.equal(0);

      // --- Phase 3: Lock period ---

      // Move to 1 hour before resolution (within 2h lock)
      await time.increaseTo(resolutionTime - 3600);
      expect(await market.isLocked()).to.be.true;

      // Betting should be blocked
      const lateBet = ethers.parseUnits("100", 6);
      await usdc.connect(trader2).approve(await market.getAddress(), lateBet);
      await expect(
        market.connect(trader2).bet(1, lateBet)
      ).to.be.revertedWithCustomError(market, "BettingLocked");

      // --- Phase 4: Resolution ---

      await time.increaseTo(resolutionTime + 1);
      await oracle.connect(resolver).proposeResolution(await market.getAddress(), 1); // YES
      await time.increase(3601);
      await oracle.connect(resolver).finalizeResolution(await market.getAddress());

      expect(await market.resolved()).to.be.true;

      // --- Phase 5: Redemption ---

      // Trader1 holds 1500 YES tokens (2000 bet - 500 withdrawn)
      const t1YesBal = await yesToken.balanceOf(trader1.address);
      expect(t1YesBal).to.equal(ethers.parseUnits("1500", 6));

      const totalPool = await market.totalPool();
      const poolYes = await market.poolYes();

      const t1Before = await usdc.balanceOf(trader1.address);
      await market.connect(trader1).redeem();
      const t1After = await usdc.balanceOf(trader1.address);

      const grossPayout = (t1YesBal * totalPool) / poolYes;
      const fee = (grossPayout * 200n) / 10000n;
      expect(t1After - t1Before).to.equal(grossPayout - fee);

      // Trader2 cannot redeem (holds NO, YES won)
      await expect(
        market.connect(trader2).redeem()
      ).to.be.revertedWithCustomError(market, "NothingToRedeem");

      // --- Phase 6: Fee withdrawal ---

      const accFees = await market.accumulatedFees();
      expect(accFees).to.be.gt(0);
    });
  });
});
