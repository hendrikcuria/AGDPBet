import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  dbPath: process.env.DB_PATH || "./data/agdpbet.db",

  // Contract addresses (set after deployment)
  factoryAddress: process.env.FACTORY_ADDRESS || "",
  oracleAddress: process.env.ORACLE_ADDRESS || "",
  usdcAddress: process.env.USDC_ADDRESS || "",

  // RPC
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  privateKey: process.env.PRIVATE_KEY || "",

  // Scraper config
  scrapeIntervalMinutes: 5,
  scrapeIntervalLastHourSeconds: 60,

  // Epoch timing (UTC+4)
  epochDurationDays: 7,
  epochEndUtcPlusHours: 4, // UTC+4
  finalizationDelayHours: 6,
};
