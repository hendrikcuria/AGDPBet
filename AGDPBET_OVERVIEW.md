# AGDPBet - Comprehensive Project Overview

**Internal Team Document | Last Updated: March 2026**

---

## Table of Contents

1. [What is AGDPBet?](#what-is-agdpbet)
2. [The Problem We Solve](#the-problem-we-solve)
3. [How It Works](#how-it-works)
4. [Core Mechanics](#core-mechanics)
5. [Market Types](#market-types)
6. [Revenue Model & Tokenomics](#revenue-model--tokenomics)
7. [Technical Architecture](#technical-architecture)
8. [User Journey](#user-journey)
9. [Relationship with Virtuals Protocol](#relationship-with-virtuals-protocol)
10. [Public Messaging & Positioning](#public-messaging--positioning)
11. [Website Copy & Content Guidelines](#website-copy--content-guidelines)
12. [Social Media Strategy](#social-media-strategy)
13. [FAQ for Public Comms](#faq-for-public-comms)

---

## What is AGDPBet?

AGDPBet is a **binary prediction market platform** built on Base (Ethereum L2) that lets users bet on the performance of AI agents in the Virtuals Protocol ecosystem.

Think of it like sports betting, but instead of teams, you're betting on **AI agents** — which one will be #1 this week, which will break into the top 10, and head-to-head matchups between agents.

**One-liner:** *"The prediction market for AI agent performance."*

**Elevator pitch:** AGDPBet turns the Virtuals Protocol leaderboard into a live betting arena. Every week, AI agents compete for rankings based on revenue, usage, and performance. We let you put money where your conviction is — bet on which agents will rise, fall, or dominate. It's DeFi meets AI meets prediction markets.

---

## The Problem We Solve

The Virtuals Protocol ecosystem has a thriving competitive landscape of AI agents, each measured by weekly performance metrics (revenue, job count, unique users, success rates). But there's no structured way to:

1. **Speculate on agent outcomes** — people have strong opinions about which agents are best, but nowhere to act on them
2. **Create price discovery around agent conviction** — how confident are people *really* in Agent X vs Agent Y?
3. **Generate additional engagement** with the Virtuals ecosystem — a secondary market that drives attention and liquidity back to the core protocol
4. **Reward informed analysis** — users who deeply understand agent performance can profit from their knowledge

AGDPBet fills this gap by providing a transparent, on-chain market where conviction meets capital.

---

## How It Works

### The Basic Flow

```
1. EPOCH STARTS (Weekly, Mon-Sun)
    |
2. MARKETS OPEN
    - "Will Agent X be #1 this epoch?"
    - "Will Agent Y finish Top 10?"
    - "Agent X vs Agent Y: Who ranks higher?"
    |
3. USERS TRADE
    - Buy YES tokens (you think it will happen)
    - Buy NO tokens (you think it won't happen)
    - Prices move based on demand (AMM)
    |
4. EPOCH ENDS
    |
5. ORACLE RESOLVES
    - Real ranking data determines outcome
    - Two-stage resolution (propose -> finalize) for safety
    |
6. WINNERS REDEEM
    - Winning outcome token holders claim their USDC
    - Losing outcome tokens become worthless
```

### Price Mechanics

AGDPBet uses a **Fixed Product Market Maker (FPMM)** — the same constant-product formula (x * y = k) used by Uniswap, but applied to prediction outcomes.

- When more people buy YES, the YES price goes up and NO goes down
- Prices always reflect the current market probability
- Example: If YES token costs $0.70, the market thinks there's a ~70% chance the event happens
- Users profit when they buy at a lower price than the final resolution (either $1.00 for winners or $0.00 for losers)

---

## Core Mechanics

### Outcome Tokens

Every market creates two ERC20 tokens:
- **YES Token** — pays out $1.00 if the predicted outcome happens
- **NO Token** — pays out $1.00 if the predicted outcome does NOT happen

### Collateral

All markets are denominated in **USDC** (USD Coin) on Base. Users need USDC to trade.

### Liquidity Provision

Users can also become liquidity providers:
- Deposit USDC into a market's liquidity pool
- Receive **AGDP-LP tokens** representing their share
- Earn trading fees proportional to their share
- Can withdraw liquidity at any time (receiving collateral + excess outcome tokens)

### Market Resolution

Resolution follows a secure two-stage process:
1. **Propose** — The oracle proposes an outcome based on actual ranking data
2. **Timelock** — A mandatory waiting period (default: 1 hour) for review
3. **Finalize** — After timelock, the resolution is confirmed and payouts enabled

There is also an emergency resolution path for edge cases (owner-only).

### Possible Outcomes

- **YES** — The predicted event happened. YES token holders redeem at $1.00
- **NO** — The predicted event did not happen. NO token holders redeem at $1.00
- **INVALID** — Something went wrong (data issues, market error). All holders get proportional refunds

---

## Market Types

### 1. EPOCH WINNER
> *"Will [Agent Name] be ranked #1 at the end of Epoch [X]?"*

The simplest and highest-stakes market. Bet on which AI agent will claim the top spot.

### 2. TOP 10
> *"Will [Agent Name] finish in the Top 10 this epoch?"*

A broader market for agents that are competitive but might not be favorites for #1. Good for mid-tier agents with upside potential.

### 3. HEAD TO HEAD
> *"Will [Agent A] rank higher than [Agent B] this epoch?"*

Direct comparisons between two specific agents. Creates intense, focused narratives.

### 4. LONG TAIL (Future)
> *"Will [Agent Name] break into the Top 50 from outside?"*

High-odds, high-reward markets for dark horse agents. Designed for users with deep alpha about lesser-known agents.

---

## Revenue Model & Tokenomics

### How AGDPBet Makes Money

**Trading Fees:** Every buy/sell transaction incurs a **2% fee** (200 basis points).

### Fee Distribution

```
Trading Fee (2%)
    |
    +-- 50% --> Treasury (AGDPBet operations, development, growth)
    |
    +-- 50% --> Agent Token Buyback Pool
                (used to buy back agent tokens,
                 supporting the Virtuals ecosystem)
```

### Why This Matters

- **Treasury share** funds ongoing development, marketing, and operations
- **Buyback pool** creates real buy pressure on agent tokens, aligning AGDPBet's success with Virtuals Protocol's success
- The more people trade on AGDPBet, the more agent tokens get bought — a positive flywheel

### Token Overview

| Token | Type | Purpose |
|-------|------|---------|
| YES / NO Tokens | ERC20 (per market) | Represent prediction outcomes, traded by users |
| AGDP-LP | ERC20 (per market) | Liquidity provider shares, earn trading fees |
| USDC | Stablecoin (collateral) | Base currency for all markets |
| Agent Tokens | External (Virtuals) | Supported via buyback pool mechanism |

---

## Technical Architecture

### Stack Overview

```
+------------------------------------------+
|            Frontend (Next.js)            |
|   React 19 + Tailwind + Wallet Connect  |
+------------------------------------------+
            |                    |
+------------------+   +------------------+
|   Backend API    |   |  Smart Contracts |
|   (Express.js)   |   |   (Solidity)     |
|   Port 3001      |   |   Base Chain     |
+------------------+   +------------------+
            |                    |
+------------------+   +------------------+
|   SQLite DB      |   |   USDC Collateral|
|   (Rankings,     |   |   Outcome Tokens |
|    Epochs)       |   |   LP Tokens      |
+------------------+   +------------------+
```

### Smart Contracts

| Contract | Purpose |
|----------|---------|
| **BinaryMarket.sol** | Core market logic — AMM trading, liquidity, resolution, redemption |
| **MarketFactory.sol** | Deploys new markets, manages oracle/fee config |
| **AGDPOracle.sol** | Two-stage resolution oracle with timelock safety |
| **OutcomeToken.sol** | ERC20 for YES/NO outcome tokens (mint/burn by market only) |
| **FeeRouter.sol** | Collects and distributes fees (treasury + buyback split) |

### Backend Services

| Service | Purpose |
|---------|---------|
| **Scraper** | Fetches agent leaderboard data every 5 minutes |
| **Scheduler** | Manages epoch timing (weekly, UTC+4) and triggers data pulls |
| **Resolver** | Connects ranking data to oracle for market resolution |
| **API** | REST endpoints for leaderboard, markets, and admin operations |

### Blockchain

- **Chain:** Base (Ethereum L2)
- **Collateral:** USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` on mainnet)
- **Solidity:** v0.8.24

---

## User Journey

### For Traders (Primary Users)

```
1. Connect wallet (MetaMask, Coinbase Wallet, etc.)
2. Browse active markets ("Who will be #1 this epoch?")
3. See current odds (YES: 65%, NO: 35%)
4. Buy YES or NO tokens with USDC
5. Watch odds shift as others trade
6. After epoch ends, winners redeem for $1.00 per token
```

### For Liquidity Providers

```
1. Connect wallet
2. Choose a market to provide liquidity
3. Deposit USDC, receive AGDP-LP tokens
4. Earn share of all trading fees in that market
5. Withdraw anytime (burn LP tokens, get USDC back)
```

### For Degens & Power Users

```
1. Study agent metrics (revenue, user count, success rates)
2. Identify mispriced markets (market says 30% but you believe 60%)
3. Buy undervalued outcome tokens
4. Sell when price moves in your favor, or hold to resolution
5. Repeat across multiple markets for portfolio exposure
```

---

## Relationship with Virtuals Protocol

AGDPBet is an **application layer built on top of the Virtuals Protocol ecosystem**. We do NOT compete with Virtuals — we amplify it.

### How We're Connected

| Aspect | Relationship |
|--------|-------------|
| **Data Source** | We use Virtuals' weekly epoch rankings as our source of truth |
| **Epoch Timing** | Our markets follow Virtuals' Monday-Sunday weekly epochs |
| **Agent Coverage** | Markets are created for agents in the Virtuals ecosystem |
| **Token Support** | 50% of all trading fees go to buying agent tokens (direct ecosystem support) |
| **Engagement** | We drive more attention, analysis, and engagement to Virtuals agents |

### Value We Add to Virtuals

1. **More eyeballs** — prediction markets create narratives and discussions around agents
2. **Price discovery** — our markets surface real-time sentiment about agent quality
3. **Buy pressure** — our buyback pool creates consistent demand for agent tokens
4. **Gamification** — adds a competitive, interactive layer to the existing leaderboard
5. **Retention** — users come back weekly to check their bets, driving repeat engagement

---

## Public Messaging & Positioning

### Brand Identity

**Tone:** Confident, sharp, slightly irreverent. We're at the intersection of DeFi degens and AI enthusiasts. Not corporate, not meme-only. Think "smart degen."

**Core narrative:** "AI agents are competing. Now you can bet on who wins."

### Key Messages (Use These Everywhere)

1. **"Bet on the future of AI"** — AGDPBet lets you put your money where your conviction is on which AI agents will dominate.

2. **"The AI agent prediction market"** — Simple, descriptive, memorable.

3. **"Every week, agents compete. Every week, you can profit."** — Ties into the weekly epoch structure and recurring engagement.

4. **"Powered by data, settled on-chain"** — Emphasizes transparency and trustlessness.

5. **"Not just watching AI — wagering on it"** — Positions users as active participants, not passive observers.

### What We Are vs. What We're NOT

| We ARE | We're NOT |
|--------|-----------|
| A prediction market for AI agent performance | A generic betting platform |
| Built on real, verifiable on-chain data | Reliant on subjective opinions |
| Aligned with the Virtuals ecosystem (buyback) | Extractive from the ecosystem |
| Transparent, on-chain settlement | A centralized sportsbook |
| A tool for informed speculation | Financial advice |

---

## Website Copy & Content Guidelines

### Hero Section

**Headline:** "Bet on AI Agent Performance"
**Subheadline:** "Predict which AI agents will dominate each week. Trade YES/NO outcomes. Win USDC."
**CTA:** "Start Trading" / "Explore Markets"

### How It Works Section (3 Steps)

**Step 1: Pick a Market**
"Browse weekly prediction markets on AI agent rankings. Who'll be #1? Who cracks the top 10?"

**Step 2: Take a Position**
"Buy YES if you think it'll happen. Buy NO if you don't. Prices move with market sentiment."

**Step 3: Win or Learn**
"After each epoch, markets resolve based on actual rankings. Winners claim their USDC."

### Features Section

- **Weekly Markets** — Fresh predictions every epoch, aligned with Virtuals Protocol rankings
- **On-Chain Settlement** — All outcomes resolved transparently via smart contracts on Base
- **Liquidity Rewards** — Provide liquidity, earn fees from every trade
- **Agent Buyback** — 50% of fees buy back agent tokens, supporting the ecosystem
- **Real-Time Odds** — Watch probabilities shift as the market reacts to agent performance

### Trust/Credibility Section

- Built on Base (Ethereum L2)
- USDC-denominated (stable collateral)
- Open-source smart contracts
- Oracle with timelock safety mechanism
- No custody of user funds

---

## Social Media Strategy

### Content Pillars

#### 1. Market Calls (40% of content)
- "New market live: Will Ethy hold #1 this epoch? Currently 62% YES."
- "Agent X just jumped 5 spots on the leaderboard. Our HEAD_TO_HEAD market is heating up."
- Weekly market recaps: "Last epoch's results: 3 markets resolved YES, 2 NO. $X in payouts."

#### 2. Education (25% of content)
- "How prediction markets work" (thread)
- "What is FPMM and why it matters for fair pricing"
- "How to read our odds: If YES = $0.70, the market thinks there's a 70% chance"
- "Liquidity providing 101: How to earn fees on AGDPBet"

#### 3. Alpha & Analysis (20% of content)
- "Agent X's revenue is up 40% this week but the market only gives them 25% for top 10. Mispriced?"
- Leaderboard snapshots with commentary
- Mid-week performance updates that tease market movements

#### 4. Community & Vibes (15% of content)
- Winner celebrations / payout screenshots
- "What are you betting on this epoch?" engagement polls
- Memes about agent performance swings
- Collaboration posts with Virtuals ecosystem

### Platform-Specific Notes

**Twitter/X:**
- Primary platform. Real-time market updates, threads, engagement
- Use charts/visuals showing probability movements
- Tag relevant agent tokens and @VirtualsProtocol

**Telegram:**
- Community hub. Deeper discussion, real-time alerts
- Bot integration for market notifications (planned)
- Weekly AMA or discussion threads

**Discord (if applicable):**
- Strategy channels per market type
- Leaderboard tracking channels
- Alpha sharing community

### Hashtags & Keywords

Primary: `#AGDPBet` `#PredictionMarkets` `#AIAgents`
Secondary: `#VirtualsProtocol` `#Base` `#DeFi` `#OnChainBetting`
Narrative: `#BetOnAI` `#AgentSeason`

---

## FAQ for Public Comms

### General

**Q: What is AGDPBet?**
A: AGDPBet is a prediction market platform where you can bet on the performance of AI agents in the Virtuals Protocol ecosystem. Markets are settled on-chain using real ranking data.

**Q: How do I make money?**
A: Buy outcome tokens (YES or NO) when you think the market is mispriced. If you buy YES at $0.40 and the event happens, you redeem at $1.00 — a 150% return. You can also earn by providing liquidity and collecting trading fees.

**Q: What chain is it on?**
A: Base, an Ethereum Layer 2. Fast transactions, low fees, secure.

**Q: What currency do I need?**
A: USDC on Base. All markets are USDC-denominated.

**Q: Is it safe?**
A: Our smart contracts use industry-standard security practices. Market resolution uses a two-stage oracle with a timelock to prevent manipulation. All settlements are fully on-chain — no one can change the outcome after resolution.

### Markets

**Q: How are markets created?**
A: Currently, the AGDPBet team creates markets for each epoch. As we grow, we plan to open market creation to the community.

**Q: How long do markets last?**
A: Markets follow Virtuals Protocol's weekly epoch cycle (Monday to Sunday, UTC+4). New markets are created at the start of each epoch.

**Q: What happens if there's a data error or dispute?**
A: Our oracle has a timelock period before finalization, allowing for review. In extreme cases, markets can be resolved as INVALID, and all users receive proportional refunds.

### Fees

**Q: What are the fees?**
A: A 2% fee on all trades. 50% goes to the AGDPBet treasury and 50% goes toward buying back agent tokens in the Virtuals ecosystem.

**Q: Do liquidity providers pay fees?**
A: No, LPs earn fees from traders. The more volume a market has, the more LPs earn.

### Ecosystem

**Q: What's the relationship with Virtuals Protocol?**
A: We're built on top of the Virtuals ecosystem. We use their agent ranking data as our source of truth, and 50% of all our trading fees go toward buying agent tokens — directly supporting the ecosystem.

**Q: Do I need to own any agent tokens to participate?**
A: No. You just need USDC on Base. However, if you're knowledgeable about specific agents, that knowledge gives you an edge in our markets.

---

## Internal Notes

### Current Status (March 2026)

- **Smart Contracts:** Core contracts complete and tested (BinaryMarket, MarketFactory, Oracle, FeeRouter, OutcomeToken)
- **Backend API:** Express.js server with scraper, scheduler, and resolver services operational
- **Frontend:** Next.js 16 scaffolding in place, UI build-out pending
- **Data Source:** Currently using mock agent data; needs integration with live Virtuals API
- **Deployment:** Ready for Base testnet; mainnet deployment pending audit

### Key Priorities

1. Complete frontend trading UI
2. Integrate live Virtuals Protocol leaderboard data (replace mock scraper)
3. Smart contract audit
4. Base mainnet deployment
5. Launch initial markets for active epoch
6. Community building (Twitter, Telegram)

---

*This document is for internal team alignment. Adapt the messaging for each platform and audience, but keep the core narrative consistent: AGDPBet is where AI agent conviction meets capital.*
