import { createConfig } from "@privy-io/wagmi";
import { base, baseSepolia, hardhat } from "wagmi/chains";
import { http } from "wagmi";

export const config = createConfig({
  chains: [baseSepolia, base, hardhat],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [baseSepolia.id]: http("https://base-sepolia.g.alchemy.com/v2/G4GBm8yNa0dcSWv93QdM-"),
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
});
