// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title OutcomeToken — ERC20 token representing a YES or NO outcome in a prediction market
/// @notice Only the parent market contract can mint and burn tokens
contract OutcomeToken is ERC20 {
    address public immutable market;

    error OnlyMarket();

    modifier onlyMarket() {
        if (msg.sender != market) revert OnlyMarket();
        _;
    }

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        market = msg.sender;
    }

    function mint(address to, uint256 amount) external onlyMarket {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyMarket {
        _burn(from, amount);
    }
}
