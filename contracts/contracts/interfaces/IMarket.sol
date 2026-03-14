// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMarket {
    enum MarketType {
        EPOCH_WINNER,
        TOP_10,
        HEAD_TO_HEAD,
        LONG_TAIL
    }

    enum Outcome {
        None,
        Yes,
        No,
        Invalid,
        Tie
    }

    event MarketInitialized(string question, MarketType marketType, uint256 resolutionTime);
    event BetPlaced(address indexed bettor, uint8 outcomeIndex, uint256 amount);
    event BetWithdrawn(address indexed bettor, uint8 outcomeIndex, uint256 tokenAmount, uint256 refund, uint256 penalty);
    event MarketResolved(Outcome outcome);
    event WinningsRedeemed(address indexed redeemer, uint256 amount);

    function bet(uint8 outcomeIndex, uint256 amount) external;
    function withdraw(uint8 outcomeIndex, uint256 tokenAmount) external;
    function resolve(Outcome outcome) external;
    function redeem() external returns (uint256 payout);
}
