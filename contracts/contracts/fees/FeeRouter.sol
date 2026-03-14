// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FeeRouter — Splits prediction market fees between treasury and agent token buyback
/// @notice Collects fees from BinaryMarket contracts, splits 50/50:
///         - 50% to AGDPBet Treasury (multisig)
///         - 50% to agent token buyback (held for later swap or manual distribution)
contract FeeRouter is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- State ---
    address public treasury;
    uint256 public treasuryBps; // Default 5000 = 50%
    uint256 public constant BASIS_POINTS = 10_000;

    // Accumulated fees per collateral token waiting for distribution
    mapping(address => uint256) public pendingFees;
    // Buyback pool per collateral token (held until distributed)
    mapping(address => uint256) public buybackPool;

    // --- Events ---
    event FeesReceived(address indexed collateralToken, uint256 amount);
    event FeesDistributed(address indexed collateralToken, uint256 toTreasury, uint256 toBuyback);
    event BuybackWithdrawn(address indexed collateralToken, uint256 amount, address indexed recipient);
    event TreasuryUpdated(address indexed newTreasury);
    event SplitUpdated(uint256 newTreasuryBps);

    // --- Errors ---
    error InvalidTreasury();
    error InvalidSplit();
    error NothingToDistribute();
    error NothingToWithdraw();

    constructor(address _treasury, uint256 _treasuryBps) Ownable(msg.sender) {
        if (_treasury == address(0)) revert InvalidTreasury();
        if (_treasuryBps > BASIS_POINTS) revert InvalidSplit();

        treasury = _treasury;
        treasuryBps = _treasuryBps;
    }

    /// @notice Receive fees from a market. Markets transfer fees here during trading.
    ///         Anyone can call this to pull accumulated fees from a market.
    /// @param collateralToken The collateral token address
    /// @param amount The fee amount to receive
    function receiveFees(address collateralToken, uint256 amount) external {
        IERC20(collateralToken).safeTransferFrom(msg.sender, address(this), amount);
        pendingFees[collateralToken] += amount;
        emit FeesReceived(collateralToken, amount);
    }

    /// @notice Distribute pending fees for a collateral token
    /// @param collateralToken The collateral token to distribute fees for
    function distributeFees(address collateralToken) external nonReentrant {
        uint256 pending = pendingFees[collateralToken];
        if (pending == 0) revert NothingToDistribute();

        pendingFees[collateralToken] = 0;

        uint256 toTreasury = (pending * treasuryBps) / BASIS_POINTS;
        uint256 toBuyback = pending - toTreasury;

        // Send treasury share
        IERC20(collateralToken).safeTransfer(treasury, toTreasury);

        // Accumulate buyback share (held until manually swapped or distributed)
        buybackPool[collateralToken] += toBuyback;

        emit FeesDistributed(collateralToken, toTreasury, toBuyback);
    }

    /// @notice Withdraw from the buyback pool (owner only, for manual agent token buyback)
    /// @param collateralToken The collateral token to withdraw
    /// @param amount Amount to withdraw
    /// @param recipient Where to send the funds (e.g., a swap contract or multisig)
    function withdrawBuyback(
        address collateralToken,
        uint256 amount,
        address recipient
    ) external onlyOwner nonReentrant {
        if (buybackPool[collateralToken] < amount) revert NothingToWithdraw();

        buybackPool[collateralToken] -= amount;
        IERC20(collateralToken).safeTransfer(recipient, amount);

        emit BuybackWithdrawn(collateralToken, amount, recipient);
    }

    // --- Admin ---

    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidTreasury();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setSplit(uint256 _treasuryBps) external onlyOwner {
        if (_treasuryBps > BASIS_POINTS) revert InvalidSplit();
        treasuryBps = _treasuryBps;
        emit SplitUpdated(_treasuryBps);
    }
}
