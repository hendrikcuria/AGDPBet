// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ParimutuelMarket.sol";
import "../interfaces/IMarket.sol";

/// @title MarketFactory — Deploys and tracks ParimutuelMarket instances
/// @notice Supports both admin-only and public market creation.
contract MarketFactory is Ownable2Step {
    using SafeERC20 for IERC20;

    address public oracle;
    address public feeRouter;
    uint256 public defaultRedemptionFeeBps;
    uint256 public defaultWithdrawalFeeBps;

    address[] public markets;
    mapping(address => bool) public isMarket;

    // --- Public creation controls ---
    mapping(address => bool) public allowedCollateral;
    uint256 public constant MIN_RESOLUTION_DELAY = 1 hours;

    event MarketCreated(
        address indexed market,
        address indexed creator,
        string question,
        IMarket.MarketType marketType,
        address collateralToken,
        uint256 resolutionTime,
        uint256 seedAmount
    );
    event OracleUpdated(address indexed newOracle);
    event FeeRouterUpdated(address indexed newFeeRouter);
    event RedemptionFeeUpdated(uint256 newFeeBps);
    event WithdrawalFeeUpdated(uint256 newFeeBps);
    event CollateralAllowed(address indexed token);
    event CollateralRemoved(address indexed token);

    error InvalidOracle();
    error InvalidFeeRouter();
    error FeeTooHigh();
    error CollateralNotAllowed();
    error ResolutionTooSoon();

    constructor(
        address _oracle,
        address _feeRouter,
        uint256 _defaultRedemptionFeeBps,
        uint256 _defaultWithdrawalFeeBps
    ) Ownable(msg.sender) {
        if (_oracle == address(0)) revert InvalidOracle();
        if (_feeRouter == address(0)) revert InvalidFeeRouter();
        if (_defaultRedemptionFeeBps > 1000) revert FeeTooHigh(); // Max 10%
        if (_defaultWithdrawalFeeBps > 2000) revert FeeTooHigh(); // Max 20%

        oracle = _oracle;
        feeRouter = _feeRouter;
        defaultRedemptionFeeBps = _defaultRedemptionFeeBps;
        defaultWithdrawalFeeBps = _defaultWithdrawalFeeBps;
    }

    // --- Internal market deployment logic ---

    function _deployMarket(
        string calldata _question,
        IMarket.MarketType _marketType,
        address _collateralToken,
        uint256 _resolutionTime,
        uint256 _seedAmount,
        address _creator
    ) internal returns (address marketAddress) {
        // Deploy new market
        ParimutuelMarket market = new ParimutuelMarket();
        marketAddress = address(market);

        // If seeding, pull collateral from creator to factory, then approve for market
        if (_seedAmount > 0) {
            IERC20(_collateralToken).safeTransferFrom(_creator, address(this), _seedAmount);
            IERC20(_collateralToken).approve(marketAddress, _seedAmount);
        }

        // Initialize the market
        market.initialize(
            _question,
            _marketType,
            _collateralToken,
            oracle,
            _resolutionTime,
            defaultRedemptionFeeBps,
            defaultWithdrawalFeeBps,
            feeRouter,
            _seedAmount
        );

        // Transfer seed outcome tokens from factory to creator
        if (_seedAmount > 0) {
            uint256 yesBalance = market.yesToken().balanceOf(address(this));
            uint256 noBalance = market.noToken().balanceOf(address(this));
            if (yesBalance > 0) {
                market.yesToken().transfer(_creator, yesBalance);
            }
            if (noBalance > 0) {
                market.noToken().transfer(_creator, noBalance);
            }
        }

        // Track the market
        markets.push(marketAddress);
        isMarket[marketAddress] = true;

        emit MarketCreated(
            marketAddress,
            _creator,
            _question,
            _marketType,
            _collateralToken,
            _resolutionTime,
            _seedAmount
        );
    }

    /// @notice Create a new parimutuel market (admin only, no restrictions)
    function createMarket(
        string calldata _question,
        IMarket.MarketType _marketType,
        address _collateralToken,
        uint256 _resolutionTime,
        uint256 _seedAmount
    ) external onlyOwner returns (address marketAddress) {
        marketAddress = _deployMarket(
            _question, _marketType, _collateralToken,
            _resolutionTime, _seedAmount, msg.sender
        );
    }

    /// @notice Create a new parimutuel market (anyone, with restrictions)
    function createMarketPublic(
        string calldata _question,
        IMarket.MarketType _marketType,
        address _collateralToken,
        uint256 _resolutionTime,
        uint256 _seedAmount
    ) external returns (address marketAddress) {
        if (!allowedCollateral[_collateralToken]) revert CollateralNotAllowed();
        if (_resolutionTime < block.timestamp + MIN_RESOLUTION_DELAY) revert ResolutionTooSoon();

        marketAddress = _deployMarket(
            _question, _marketType, _collateralToken,
            _resolutionTime, _seedAmount, msg.sender
        );
    }

    // --- View functions ---

    function getMarkets() external view returns (address[] memory) {
        return markets;
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    // --- Admin ---

    function addCollateral(address _token) external onlyOwner {
        allowedCollateral[_token] = true;
        emit CollateralAllowed(_token);
    }

    function removeCollateral(address _token) external onlyOwner {
        allowedCollateral[_token] = false;
        emit CollateralRemoved(_token);
    }

    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert InvalidOracle();
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    function setFeeRouter(address _feeRouter) external onlyOwner {
        if (_feeRouter == address(0)) revert InvalidFeeRouter();
        feeRouter = _feeRouter;
        emit FeeRouterUpdated(_feeRouter);
    }

    function setDefaultRedemptionFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 1000) revert FeeTooHigh();
        defaultRedemptionFeeBps = _feeBps;
        emit RedemptionFeeUpdated(_feeBps);
    }

    function setDefaultWithdrawalFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > 2000) revert FeeTooHigh();
        defaultWithdrawalFeeBps = _feeBps;
        emit WithdrawalFeeUpdated(_feeBps);
    }
}
