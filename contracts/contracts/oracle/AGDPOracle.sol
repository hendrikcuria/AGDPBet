// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IMarket.sol";

/// @title AGDPOracle — Admin-controlled oracle for resolving AGDPBet markets
/// @notice For MVP, an authorized resolver (admin wallet or backend service) pushes resolution.
///         Includes a timelock delay for dispute window.
contract AGDPOracle is Ownable2Step, Pausable {
    // --- State ---
    address public resolver;
    uint256 public timelockDuration; // seconds between proposing and finalizing

    struct PendingResolution {
        IMarket.Outcome outcome;
        uint256 proposedAt;
        bool finalized;
    }

    mapping(address => PendingResolution) public pendingResolutions;

    // --- Events ---
    event ResolutionProposed(address indexed market, IMarket.Outcome outcome, uint256 executeAfter);
    event ResolutionFinalized(address indexed market, IMarket.Outcome outcome);
    event ResolutionCancelled(address indexed market);
    event ResolverUpdated(address indexed newResolver);
    event TimelockUpdated(uint256 newDuration);

    // --- Errors ---
    error NotResolver();
    error NoPendingResolution();
    error TimelockNotExpired();
    error AlreadyFinalized();
    error InvalidOutcome();

    modifier onlyResolver() {
        if (msg.sender != resolver) revert NotResolver();
        _;
    }

    constructor(address _resolver, uint256 _timelockDuration) Ownable(msg.sender) {
        resolver = _resolver;
        timelockDuration = _timelockDuration;
    }

    /// @notice Propose a resolution for a market (starts timelock)
    /// @param market Address of the BinaryMarket contract
    /// @param _outcome The proposed outcome (Yes, No, or Invalid)
    function proposeResolution(address market, IMarket.Outcome _outcome)
        external
        onlyResolver
        whenNotPaused
    {
        if (_outcome == IMarket.Outcome.None) revert InvalidOutcome();

        pendingResolutions[market] = PendingResolution({
            outcome: _outcome,
            proposedAt: block.timestamp,
            finalized: false
        });

        emit ResolutionProposed(market, _outcome, block.timestamp + timelockDuration);
    }

    /// @notice Finalize a resolution after the timelock has expired
    /// @param market Address of the BinaryMarket contract
    function finalizeResolution(address market) external onlyResolver whenNotPaused {
        PendingResolution storage pending = pendingResolutions[market];
        if (pending.proposedAt == 0) revert NoPendingResolution();
        if (pending.finalized) revert AlreadyFinalized();
        if (block.timestamp < pending.proposedAt + timelockDuration) revert TimelockNotExpired();

        pending.finalized = true;

        // Call resolve on the market
        IMarket(market).resolve(pending.outcome);

        emit ResolutionFinalized(market, pending.outcome);
    }

    /// @notice Cancel a pending resolution (owner only, for emergencies)
    function cancelResolution(address market) external onlyOwner {
        if (pendingResolutions[market].proposedAt == 0) revert NoPendingResolution();

        delete pendingResolutions[market];

        emit ResolutionCancelled(market);
    }

    /// @notice Resolve a market immediately (bypasses timelock, owner only, for emergencies)
    function emergencyResolve(address market, IMarket.Outcome _outcome) external onlyOwner {
        if (_outcome == IMarket.Outcome.None) revert InvalidOutcome();

        pendingResolutions[market] = PendingResolution({
            outcome: _outcome,
            proposedAt: block.timestamp,
            finalized: true
        });

        IMarket(market).resolve(_outcome);

        emit ResolutionFinalized(market, _outcome);
    }

    // --- View ---

    function getResolutionStatus(address market)
        external
        view
        returns (IMarket.Outcome proposedOutcome, uint256 proposedAt, bool finalized, uint256 executeAfter)
    {
        PendingResolution memory pending = pendingResolutions[market];
        return (
            pending.outcome,
            pending.proposedAt,
            pending.finalized,
            pending.proposedAt + timelockDuration
        );
    }

    // --- Admin ---

    function setResolver(address _resolver) external onlyOwner {
        resolver = _resolver;
        emit ResolverUpdated(_resolver);
    }

    function setTimelockDuration(uint256 _duration) external onlyOwner {
        timelockDuration = _duration;
        emit TimelockUpdated(_duration);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
