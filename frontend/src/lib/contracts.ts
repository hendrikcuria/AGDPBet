// Contract addresses — update after deployment
export const CONTRACTS = {
  factory: (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  oracle: (process.env.NEXT_PUBLIC_ORACLE_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  feeRouter: (process.env.NEXT_PUBLIC_FEE_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913") as `0x${string}`,
  // GBET on hold until platform gains traction — kept for future multi-collateral toggle
  gbet: (process.env.NEXT_PUBLIC_GBET_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Collateral token registry — maps lowercase address to metadata
export const COLLATERAL_TOKENS: Record<string, { symbol: string; decimals: number }> = {
  [CONTRACTS.usdc.toLowerCase()]: { symbol: "USDC", decimals: 6 },
  [CONTRACTS.gbet.toLowerCase()]: { symbol: "GBET", decimals: 18 },
};

// Helper to look up collateral info by address
export function getCollateralInfo(address: string): { symbol: string; decimals: number } {
  return COLLATERAL_TOKENS[address.toLowerCase()] || { symbol: "TOKEN", decimals: 18 };
}

// --- ABIs (minimal, for frontend interaction) ---

export const MARKET_ABI = [
  // --- Mutative ---
  {
    inputs: [{ name: "outcomeIndex", type: "uint8" }, { name: "amount", type: "uint256" }],
    name: "bet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "outcomeIndex", type: "uint8" }, { name: "tokenAmount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "redeem",
    outputs: [{ name: "payout", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // --- Views ---
  { inputs: [], name: "question", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "marketType", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "collateralToken", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "priceYes", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "priceNo", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "poolYes", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "poolNo", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalPool", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "resolved", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "outcome", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "resolutionTime", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "accumulatedFees", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalCollateral", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "yesToken", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "noToken", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "redemptionFeeBps", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "withdrawalFeeBps", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ name: "outcomeIndex", type: "uint8" }, { name: "tokenAmount", type: "uint256" }],
    name: "calcPayout",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenAmount", type: "uint256" }],
    name: "calcWithdrawal",
    outputs: [{ name: "netRefund", type: "uint256" }, { name: "penalty", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "outcomeIndex", type: "uint8" }],
    name: "payoutMultiplier",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // --- New: lock period + zero-winner fallback ---
  { inputs: [], name: "bettingLockPeriod", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "isLocked", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  {
    inputs: [],
    name: "redeemZeroWinnerFallback",
    outputs: [{ name: "payout", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const FACTORY_ABI = [
  {
    inputs: [],
    name: "getMarkets",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMarketCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "_question", type: "string" },
      { name: "_marketType", type: "uint8" },
      { name: "_collateralToken", type: "address" },
      { name: "_resolutionTime", type: "uint256" },
      { name: "_seedAmount", type: "uint256" },
    ],
    name: "createMarketPublic",
    outputs: [{ name: "marketAddress", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "allowedCollateral",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "market", type: "address" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "question", type: "string" },
      { indexed: false, name: "marketType", type: "uint8" },
      { indexed: false, name: "collateralToken", type: "address" },
      { indexed: false, name: "resolutionTime", type: "uint256" },
      { indexed: false, name: "seedAmount", type: "uint256" },
    ],
    name: "MarketCreated",
    type: "event",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  { inputs: [], name: "decimals", outputs: [{ name: "", type: "uint8" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ name: "", type: "string" }], stateMutability: "view", type: "function" },
] as const;
