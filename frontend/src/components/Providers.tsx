"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { config } from "@/lib/wagmi";
import { AppStateProvider } from "@/lib/appState";
import { useState } from "react";
import { base, baseSepolia, hardhat } from "wagmi/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            gcTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#00E5FF",
          logo: "/agdp-logo.svg",
          landingHeader: "Sign in to AGDPBet",
          loginMessage: "Trade prediction markets on AI agent rankings",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        supportedChains: [baseSepolia, base, hardhat],
        defaultChain: baseSepolia,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <AppStateProvider>
            {children}
          </AppStateProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
