// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./OutcomeToken.sol";
import "../interfaces/IMarket.sol";

/// @title ParimutuelMarket — A binary prediction market using parimutuel pooling
/// @notice Users bet collateral into YES/NO pools. Winners split the entire pool
///         proportional to their share of the winning side.
contract ParimutuelMarket is IMarket, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- Constants ---
    uint256 public constant BASIS_POINTS = 10_000;
    uint8 public constant YES = 0;
    uint8 public constant NO = 1;

    // --- Market metadata ---
    string public question;
    MarketType public marketType;
    IERC20 public collateralToken;
    address public oracle;
    address public factory;
    uint256 public resolutionTime;
    uint256 public createdAt;
    bool public resolved;
    Outcome public outcome;

    // --- Fee config ---
    uint256 public redemptionFeeBps;   // fee on winning payouts (e.g. 200 = 2%)
    uint256 public withdrawalFeeBps;   // penalty on early withdrawal (e.g. 500 = 5%)
    address public feeRouter;
    uint256 public accumulatedFees;

    // --- Lock period ---
    uint256 public bettingLockPeriod;  // seconds before resolutionTime when bets/withdrawals lock

    // --- Outcome tokens ---
    OutcomeToken public yesToken;
    OutcomeToken public noToken;

    // --- Pool state ---
    uint256 public poolYes;    // total collateral bet on YES
    uint256 public poolNo;     // total collateral bet on NO
    uint256 public totalPool;  // poolYes + poolNo
    bool public initialized;

    // --- Errors ---
    error NotOracle();
    error NotFactory();
    error MarketNotActive();
    error MarketNotResolved();
    error AlreadyResolved();
    error AlreadyInitialized();
    error NotInitialized();
    error InvalidOutcomeIndex();
    error ZeroAmount();
    error TooEarlyToResolve();
    error NothingToRedeem();
    error InvalidOutcome();
    error WithdrawalsClosed();
    error BettingLocked();

    modifier onlyOracle() {
        if (msg.sender != oracle) revert NotOracle();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    modifier marketActive() {
        if (resolved) revert MarketNotActive();
        if (!initialized) revert NotInitialized();
        if (block.timestamp >= resolutionTime) revert MarketNotActive();
        _;
    }

    constructor() {
        factory = msg.sender;
    }

    // --- Initialization (called by factory) ---

    function initialize(
        string calldata _question,
        MarketType _marketType,
        address _collateralToken,
        address _oracle,
        uint256 _resolutionTime,
        uint256 _redemptionFeeBps,
        uint256 _withdrawalFeeBps,
        address _feeRouter,
        uint256 _seedAmount
    ) external onlyFactory {
        if (initialized) revert AlreadyInitialized();

        question = _question;
        marketType = _marketType;
        collateralToken = IERC20(_collateralToken);
        oracle = _oracle;
        resolutionTime = _resolutionTime;
        redemptionFeeBps = _redemptionFeeBps;
        withdrawalFeeBps = _withdrawalFeeBps;
        feeRouter = _feeRouter;
        bettingLockPeriod = 2 hours; // Default: lock 2 hours before resolution
        createdAt = block.timestamp;
        initialized = true;

        // Deploy outcome tokens
        yesToken = new OutcomeToken(
            string.concat("YES: ", _question),
            "YES"
        );
        noToken = new OutcomeToken(
            string.concat("NO: ", _question),
            "NO"
        );

        // Optional seed: admin places an equal bet on both sides
        if (_seedAmount > 0) {
            collateralToken.safeTransferFrom(msg.sender, address(this), _seedAmount);

            uint256 halfSeed = _seedAmount / 2;
            uint256 otherHalf = _seedAmount - halfSeed; // handles odd amounts

            poolYes = halfSeed;
            poolNo = otherHalf;
            totalPool = _seedAmount;

            // Mint outcome tokens to factory (which transfers to creator)
            yesToken.mint(msg.sender, halfSeed);
            noToken.mint(msg.sender, otherHalf);
        }

        emit MarketInitialized(_question, _marketType, _resolutionTime);
    }

    // --- Betting ---

    /// @notice Place a bet on YES (0) or NO (1) by depositing collateral
    /// @param outcomeIndex 0 for YES, 1 for NO
    /// @param amount Amount of collateral to bet
    function bet(
        uint8 outcomeIndex,
        uint256 amount
    ) external override nonReentrant whenNotPaused marketActive {
        if (amount == 0) revert ZeroAmount();
        if (outcomeIndex > 1) revert InvalidOutcomeIndex();
        // Lock betting before resolution
        if (block.timestamp >= resolutionTime - bettingLockPeriod) revert BettingLocked();

        // Pull collateral from bettor
        collateralToken.safeTransferFrom(msg.sender, address(this), amount);

        // Mint outcome tokens 1:1 to bettor
        if (outcomeIndex == YES) {
            yesToken.mint(msg.sender, amount);
            poolYes += amount;
        } else {
            noToken.mint(msg.sender, amount);
            poolNo += amount;
        }
        totalPool += amount;

        emit BetPlaced(msg.sender, outcomeIndex, amount);
    }

    // --- Withdrawal ---

    /// @notice Withdraw a bet before resolution with a penalty fee.
    ///         The penalty stays in the pool to reward remaining bettors.
    /// @param outcomeIndex 0 for YES, 1 for NO
    /// @param tokenAmount Amount of outcome tokens to return
    function withdraw(
        uint8 outcomeIndex,
        uint256 tokenAmount
    ) external override nonReentrant whenNotPaused {
        if (tokenAmount == 0) revert ZeroAmount();
        if (outcomeIndex > 1) revert InvalidOutcomeIndex();
        if (resolved) revert WithdrawalsClosed();
        if (!initialized) revert NotInitialized();
        if (block.timestamp >= resolutionTime) revert WithdrawalsClosed();
        // Lock withdrawals before resolution (same lock as betting)
        if (block.timestamp >= resolutionTime - bettingLockPeriod) revert WithdrawalsClosed();

        // Calculate penalty — penalty collateral stays in pool (not extracted)
        uint256 penalty = (tokenAmount * withdrawalFeeBps) / BASIS_POINTS;
        uint256 refund = tokenAmount - penalty;

        // Burn outcome tokens from withdrawer
        if (outcomeIndex == YES) {
            yesToken.burn(msg.sender, tokenAmount);
            // Only reduce pool by the refund amount; penalty stays in the pool
            poolYes -= refund;
        } else {
            noToken.burn(msg.sender, tokenAmount);
            poolNo -= refund;
        }
        // totalPool decreases only by refund — penalty stays
        totalPool -= refund;

        // Transfer refund to withdrawer (penalty collateral remains in contract)
        collateralToken.safeTransfer(msg.sender, refund);

        emit BetWithdrawn(msg.sender, outcomeIndex, tokenAmount, refund, penalty);
    }

    // --- Resolution ---

    /// @notice Resolve the market. Only callable by the oracle after resolutionTime.
    function resolve(Outcome _outcome) external override onlyOracle {
        if (resolved) revert AlreadyResolved();
        if (block.timestamp < resolutionTime) revert TooEarlyToResolve();
        if (_outcome == Outcome.None) revert InvalidOutcome();

        resolved = true;
        outcome = _outcome;

        emit MarketResolved(_outcome);
    }

    // --- Redemption ---

    /// @notice Redeem tokens after resolution. Winners get proportional share of total pool.
    /// @return payout Amount of collateral received
    function redeem() external override nonReentrant returns (uint256 payout) {
        if (!resolved) revert MarketNotResolved();

        if (outcome == Outcome.Invalid || outcome == Outcome.Tie) {
            // Refund: return both YES and NO tokens at face value minus fee
            uint256 yesBal = yesToken.balanceOf(msg.sender);
            uint256 noBal = noToken.balanceOf(msg.sender);
            uint256 totalBet = yesBal + noBal;
            if (totalBet == 0) revert NothingToRedeem();

            uint256 fee = (totalBet * redemptionFeeBps) / BASIS_POINTS;
            payout = totalBet - fee;
            accumulatedFees += fee;

            if (yesBal > 0) yesToken.burn(msg.sender, yesBal);
            if (noBal > 0) noToken.burn(msg.sender, noBal);
        } else {
            // Determine winning side
            OutcomeToken winToken = (outcome == Outcome.Yes) ? yesToken : noToken;
            uint256 winningPool = (outcome == Outcome.Yes) ? poolYes : poolNo;
            uint256 userTokens = winToken.balanceOf(msg.sender);
            if (userTokens == 0) revert NothingToRedeem();

            // Edge case: winning side has zero pool (all winners withdrew)
            // This means the losing side's collateral has no claimant.
            // Refund winners at face value; remainder goes to fees.
            if (winningPool == 0) {
                // This shouldn't happen if userTokens > 0, but guard against it
                revert NothingToRedeem();
            }

            uint256 grossPayout = (userTokens * totalPool) / winningPool;
            uint256 fee = (grossPayout * redemptionFeeBps) / BASIS_POINTS;
            payout = grossPayout - fee;
            accumulatedFees += fee;

            winToken.burn(msg.sender, userTokens);
        }

        collateralToken.safeTransfer(msg.sender, payout);

        emit WinningsRedeemed(msg.sender, payout);
    }

    /// @notice Allow losers to reclaim when the winning side has zero bets.
    ///         If NO ONE bet on the winning outcome, the pool is refunded to the other side.
    function redeemZeroWinnerFallback() external nonReentrant returns (uint256 payout) {
        if (!resolved) revert MarketNotResolved();
        if (outcome == Outcome.Invalid || outcome == Outcome.Tie || outcome == Outcome.None) {
            revert InvalidOutcome();
        }

        uint256 winningPool = (outcome == Outcome.Yes) ? poolYes : poolNo;
        // This function is ONLY for when the winning side has zero pool
        require(winningPool == 0, "Use redeem() when winning side has bets");

        // Refund the losing side at face value minus fee
        OutcomeToken loserToken = (outcome == Outcome.Yes) ? noToken : yesToken;
        uint256 userTokens = loserToken.balanceOf(msg.sender);
        if (userTokens == 0) revert NothingToRedeem();

        uint256 fee = (userTokens * redemptionFeeBps) / BASIS_POINTS;
        payout = userTokens - fee;
        accumulatedFees += fee;

        loserToken.burn(msg.sender, userTokens);
        collateralToken.safeTransfer(msg.sender, payout);

        emit WinningsRedeemed(msg.sender, payout);
    }

    // --- Fee withdrawal ---

    /// @notice Transfer accumulated fees to the fee router
    function withdrawFees() external {
        uint256 fees = accumulatedFees;
        if (fees == 0) return;
        accumulatedFees = 0;
        collateralToken.safeTransfer(feeRouter, fees);
    }

    // --- View functions ---

    /// @notice Implied probability of YES, scaled to 1e18
    function priceYes() external view returns (uint256) {
        if (totalPool == 0) return 5e17; // 50% default
        return (poolYes * 1e18) / totalPool;
    }

    /// @notice Implied probability of NO, scaled to 1e18
    function priceNo() external view returns (uint256) {
        if (totalPool == 0) return 5e17; // 50% default
        return (poolNo * 1e18) / totalPool;
    }

    /// @notice Estimate payout if the given side wins
    /// @param outcomeIndex 0 for YES, 1 for NO
    /// @param tokenAmount Amount of outcome tokens held
    function calcPayout(uint8 outcomeIndex, uint256 tokenAmount)
        external
        view
        returns (uint256)
    {
        uint256 pool = (outcomeIndex == YES) ? poolYes : poolNo;
        if (pool == 0) return 0;
        uint256 gross = (tokenAmount * totalPool) / pool;
        uint256 fee = (gross * redemptionFeeBps) / BASIS_POINTS;
        return gross - fee;
    }

    /// @notice Calculate withdrawal refund and penalty
    /// @param tokenAmount Amount of tokens to withdraw
    function calcWithdrawal(uint256 tokenAmount)
        external
        view
        returns (uint256 netRefund, uint256 penalty)
    {
        penalty = (tokenAmount * withdrawalFeeBps) / BASIS_POINTS;
        netRefund = tokenAmount - penalty;
    }

    /// @notice Payout multiplier for a given side, scaled to 1e18
    /// @dev A multiplier of 2e18 means 2x payout
    function payoutMultiplier(uint8 outcomeIndex) external view returns (uint256) {
        uint256 pool = (outcomeIndex == YES) ? poolYes : poolNo;
        if (pool == 0) return 0;
        return (totalPool * 1e18) / pool;
    }

    /// @notice Check if betting/withdrawals are currently locked
    function isLocked() external view returns (bool) {
        return block.timestamp >= resolutionTime - bettingLockPeriod;
    }

    /// @notice Get total collateral locked in the market
    function totalCollateral() external view returns (uint256) {
        return collateralToken.balanceOf(address(this));
    }

    // --- Admin ---

    function pause() external onlyOracle {
        _pause();
    }

    function unpause() external onlyOracle {
        _unpause();
    }
}
