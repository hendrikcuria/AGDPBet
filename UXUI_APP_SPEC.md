# AGDPBet — App UX/UI Specification

**No landing page. App-first. Open the site, you're in the product.**

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Information Architecture](#2-information-architecture)
3. [Global Layout & Navigation](#3-global-layout--navigation)
4. [Page 1: Home Feed (Markets)](#4-page-1-home-feed-markets)
5. [Page 2: Market Detail](#5-page-2-market-detail)
6. [Page 3: Leaderboard](#6-page-3-leaderboard)
7. [Page 4: Portfolio](#7-page-4-portfolio)
8. [Components Library](#8-components-library)
9. [Design System & Tokens](#9-design-system--tokens)
10. [Responsive & Mobile](#10-responsive--mobile)
11. [Wallet & Onboarding Flow](#11-wallet--onboarding-flow)
12. [Interactions & Micro-UX](#12-interactions--micro-ux)
13. [Empty, Loading & Error States](#13-empty-loading--error-states)
14. [Accessibility](#14-accessibility)

---

## 1. Design Philosophy

### Core Principles

| Principle | What it means |
|-----------|---------------|
| **App-first** | No landing page. Users open the site and see live markets immediately. The product IS the pitch. |
| **Data-dense, visually clean** | Show lots of information without feeling cluttered. Every pixel earns its place. |
| **Price = Probability** | A YES token at $0.72 means 72% chance. No mental math. No odds formats. |
| **Trade in 2 clicks** | See a market → click YES/NO → enter amount → confirm. Minimal friction. |
| **Weekly rhythm** | The entire UI revolves around the current epoch. Countdown is always visible. |

### Visual Identity

AGDPBet sits at the intersection of DeFi trading terminal and prediction market. Dark mode only. Clean, sharp, data-forward.

**Mood references:**
- Polymarket's card-based market feed
- Bloomberg terminal's information density
- Virtuals Protocol's purple/dark aesthetic (ecosystem alignment)

**What we are NOT:**
- Not a casino (no flashy animations, no slot-machine vibes)
- Not a generic DeFi dashboard (we have a specific domain: AI agents)
- Not a crypto exchange (no complex order types for MVP)

---

## 2. Information Architecture

```
AGDPBet App
│
├── / ........................ Home Feed (Markets Grid)
│   ├── Featured/Trending carousel
│   ├── Category filters (Epoch Winner, Top 10, H2H, Long Tail)
│   ├── Sort options (Trending, Volume, Newest, Ending Soon)
│   └── Market cards grid
│
├── /markets/[address] ...... Market Detail
│   ├── Market header (question, type, countdown)
│   ├── Probability chart (YES price over time)
│   ├── Market stats (volume, reserves, fee)
│   ├── Trade panel (buy/sell YES/NO)
│   └── Activity feed (recent trades)
│
├── /leaderboard ............ Agent Leaderboard
│   ├── Current epoch info + countdown
│   ├── Rankings table (sortable columns)
│   └── Agent detail expansion (metrics breakdown)
│
└── /portfolio .............. User Portfolio
    ├── Summary bar (total value, open positions, available USDC)
    ├── Active positions list
    ├── Resolved positions (claimable)
    └── Trade history
```

---

## 3. Global Layout & Navigation

### Top Navigation Bar (Sticky)

```
┌─────────────────────────────────────────────────────────────────────┐
│  AGDPBet     Markets   Leaderboard   Portfolio    ⏱ 3d 14h   [Connect Wallet]  │
│              ───────                                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Left:** Logo — "AGDP" in white, "Bet" in indigo-400. Clickable, returns to home feed.

**Center:** Navigation links
- **Markets** (home/default) — the main feed
- **Leaderboard** — agent rankings
- **Portfolio** — user's positions (shows dot indicator if positions exist)

**Right:**
- **Epoch Countdown** — compact timer showing time remaining in current epoch. Turns red in final hour. Always visible so users feel the weekly urgency.
- **Connect Wallet** — RainbowKit button. When connected: shows shortened address + network indicator.

**Behavior:**
- Sticky on scroll (`position: sticky; top: 0`)
- Backdrop blur (`backdrop-blur-xl`) with semi-transparent dark background
- Active nav item: indigo underline or pill highlight
- Mobile: hamburger menu for nav items, countdown + wallet always visible

---

## 4. Page 1: Home Feed (Markets)

This is the homepage. No hero, no "about us", no marketing. Just markets.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAV BAR                                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │  FEATURED 1  │ │  FEATURED 2  │ │  FEATURED 3  │  ← scroll →  │
│  │  "Will Ethy  │ │  "Clawd vs   │ │  "Will Data  │               │
│  │  be #1?"     │ │  AgentFi"    │ │  Oracle top  │               │
│  │  YES 67%     │ │  YES 54%     │ │  10?"        │               │
│  │  $12.4k vol  │ │  $8.2k vol   │ │  YES 81%     │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ All  │ Epoch Winner │ Top 10 │ Head-to-Head │ Long Tail    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  Sort: Trending ▾   Epoch 22                        12 markets    │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ Market Card  │ │ Market Card  │ │ Market Card  │               │
│  │              │ │              │ │              │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ Market Card  │ │ Market Card  │ │ Market Card  │               │
│  │              │ │              │ │              │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Featured Markets Carousel

A horizontally scrollable row of 3-5 highlighted markets. These are the highest-volume or most interesting markets this epoch.

**Featured Card (larger than regular market cards):**
- Market question (bold, 1-2 lines)
- Market type badge (colored pill)
- YES/NO probability bars (emerald/rose)
- 24h volume
- Time remaining
- Subtle gradient border or glow to distinguish from regular cards

**Selection criteria (automated):** Highest volume, largest probability shifts, or manually pinned by admin.

### Filter Bar

A horizontal row of filter pills:

```
[ All ]  [ 🏆 Epoch Winner ]  [ 🔟 Top 10 ]  [ ⚔️ Head-to-Head ]  [ 🌱 Long Tail ]
```

- "All" selected by default
- Each pill uses the market type color scheme:
  - Epoch Winner: yellow
  - Top 10: blue
  - Head-to-Head: purple
  - Long Tail: green
- Active pill: filled background. Inactive: ghost/outline style.
- Count badge on each pill showing number of active markets of that type.

### Sort Options

Dropdown or toggle row below filter pills:

| Sort Option | Description |
|-------------|-------------|
| **Trending** | Highest volume in last 24h (default) |
| **Volume** | Total lifetime volume |
| **Newest** | Most recently created |
| **Ending Soon** | Closest to resolution time |
| **Most Competitive** | YES price closest to 50% (most uncertain outcomes) |

### Market Cards Grid

3-column grid (desktop), 2-column (tablet), 1-column (mobile).

**Market Card Anatomy:**

```
┌──────────────────────────────────────┐
│ ┌────────────┐            ⏱ 2d 7h  │
│ │ Epoch Winner│                      │
│ └────────────┘                      │
│                                      │
│ Will Ethy be ranked #1 at           │
│ the end of Epoch 22?                │
│                                      │
│ ┌─────────────────────────────┐     │
│ │ YES  ██████████████░░░  67% │     │
│ └─────────────────────────────┘     │
│ ┌─────────────────────────────┐     │
│ │ NO   █████████░░░░░░░░  33% │     │
│ └─────────────────────────────┘     │
│                                      │
│ $12,450 Vol          0.2% Fee       │
└──────────────────────────────────────┘
```

**Card States:**

| State | Visual Treatment |
|-------|-----------------|
| **Active** | Default card. Hover: subtle lift + border brightens |
| **Sniping Window** (< 1 hour left) | Red pulsing border. Red timer text. "FINAL HOUR" badge |
| **Resolved: YES** | Emerald left border accent. "Resolved: YES" badge. Dimmed probability bars |
| **Resolved: NO** | Rose left border accent. "Resolved: NO" badge. Dimmed probability bars |
| **Resolved: Invalid** | Gray left border. "Invalid" badge. Opacity reduced |

**Probability Bars:**
- YES bar: emerald-500 fill, percentage text overlaid right-aligned
- NO bar: rose-500 fill, percentage text overlaid right-aligned
- Bar width = percentage of total (so 67% YES bar fills 67% of the row)
- Animate width on load and on data change

**Click behavior:** Entire card is clickable → navigates to `/markets/[address]`

---

## 5. Page 2: Market Detail

The main trading screen. Two-column layout on desktop.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAV BAR                                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ← Back to Markets                                                 │
│                                                                     │
│  ┌────────────┐                                                    │
│  │ Top 10     │  Epoch 22          Resolves in 3d 14h 22m         │
│  └────────────┘                                                    │
│                                                                     │
│  Will DataOracle finish in the Top 10 this epoch?                  │
│                                                                     │
│  ┌────────────────────────────────────┐  ┌──────────────────────┐  │
│  │                                    │  │    TRADE PANEL       │  │
│  │         PROBABILITY CHART          │  │                      │  │
│  │                                    │  │  [BUY]  [SELL]       │  │
│  │    ╭──╮                            │  │                      │  │
│  │   ╭╯  ╰──╮     ╭──╮               │  │  ┌────┐  ┌────┐     │  │
│  │  ╭╯      ╰─╮  ╭╯  ╰╮             │  │  │YES │  │ NO │     │  │
│  │ ─╯         ╰──╯    ╰──            │  │  │81% │  │19% │     │  │
│  │                                    │  │  └────┘  └────┘     │  │
│  │  [1H] [6H] [1D] [1W] [ALL]       │  │                      │  │
│  │                                    │  │  Amount (USDC)       │  │
│  └────────────────────────────────────┘  │  ┌──────────┐ [MAX] │  │
│                                          │  │ 100.00   │       │  │
│  ┌────────────────────────────────────┐  │  └──────────┘       │  │
│  │ MARKET STATS                       │  │                      │  │
│  │                                    │  │  Est. shares: 123.4  │  │
│  │  Volume     Liquidity    Fee      │  │  Avg price: $0.81    │  │
│  │  $12,450    $8,200       2%       │  │  Max payout: $123.40 │  │
│  │                                    │  │                      │  │
│  │  YES Reserve   NO Reserve         │  │  ┌──────────────────┐│  │
│  │  4,200 USDC    8,100 USDC        │  │  │   Buy YES →      ││  │
│  └────────────────────────────────────┘  │  └──────────────────┘│  │
│                                          └──────────────────────┘  │
│  ┌────────────────────────────────────┐                            │
│  │ RECENT ACTIVITY                    │                            │
│  │                                    │                            │
│  │  0x1a2b bought 50 YES @ $0.81     │                            │
│  │  0xc3d4 sold 120 NO @ $0.19       │                            │
│  │  0xe5f6 added $500 liquidity      │                            │
│  └────────────────────────────────────┘                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Market Header

- **Back link:** "← Back to Markets" (or breadcrumb: Markets > [Question])
- **Type badge:** Colored pill (same palette as cards)
- **Epoch indicator:** "Epoch 22"
- **Countdown:** "Resolves in 3d 14h 22m" — turns red in final hour with pulse
- **Market question:** Large, bold text (text-2xl or text-3xl)
- **Contract address:** Small monospace text with copy button (for power users)

### Probability Chart (Left Column)

A line chart showing the YES token price over time.

**Chart specs:**
- Y-axis: 0% to 100% (probability)
- X-axis: time
- Line color: indigo-400 (primary)
- Fill: subtle indigo gradient below the line
- Current price highlighted with a dot + tooltip
- Timeframe toggles: `1H | 6H | 1D | 1W | ALL`
- Hover: crosshair showing exact price + timestamp

**Data source:** Historical price data from contract events or API snapshots.

**If no historical data yet (MVP):** Show a static display of current YES/NO probabilities as large number cards instead:

```
┌─────────────────────┐  ┌─────────────────────┐
│        YES          │  │         NO           │
│        81%          │  │        19%           │
│    $0.81 / share    │  │    $0.19 / share     │
└─────────────────────┘  └─────────────────────┘
```

### Market Stats Grid

A row of stat cards below the chart:

| Stat | Value | Format |
|------|-------|--------|
| Total Volume | $12,450 | `formatUSDC()` |
| Liquidity | $8,200 | Total collateral in pool |
| Fee | 2% | `feeBps / 100` |
| YES Reserve | 4,200 USDC | Raw reserve amount |
| NO Reserve | 8,100 USDC | Raw reserve amount |

### Trade Panel (Right Column, Sticky)

The core interaction point. Sticky positioning so it follows scroll.

**Structure:**

```
┌──────────────────────────────┐
│  [ BUY ]        [ SELL ]     │   ← Toggle tabs
│                              │
│  Outcome:                    │
│  ┌──────────┐ ┌──────────┐  │
│  │   YES    │ │    NO    │  │   ← Outcome selection
│  │   81%    │ │   19%    │  │      Active = colored border
│  └──────────┘ └──────────┘  │
│                              │
│  Amount (USDC)               │
│  ┌────────────────────┐ MAX │   ← Input field
│  │ 100.00             │     │
│  └────────────────────┘     │
│  Balance: 1,234.56 USDC     │   ← Shown in BUY mode
│                              │
│  ┌──────────────────────────┐│
│  │ Est. shares    123.45    ││   ← Trade preview
│  │ Avg. price     $0.81    ││
│  │ Max payout     $123.45  ││
│  │ Fee            $2.00    ││
│  │ Price impact   0.3%     ││
│  └──────────────────────────┘│
│                              │
│  ┌──────────────────────────┐│
│  │      Buy YES →           ││   ← Action button
│  └──────────────────────────┘│
│                              │
└──────────────────────────────┘
```

**Buy Mode:**
- Select outcome (YES or NO)
- Enter USDC amount
- Preview shows: estimated shares received, average price per share, maximum payout (shares × $1.00), fee amount, price impact %
- Button states:
  - No wallet: "Connect Wallet" (triggers RainbowKit modal)
  - Needs approval: "Approve USDC" (yellow/amber button)
  - Ready: "Buy YES" (emerald) or "Buy NO" (rose)
  - Processing: spinner + "Confirming..."

**Sell Mode:**
- Select outcome (YES or NO)
- Enter token amount (shows balance of selected token)
- Preview shows: estimated USDC received, average sell price, fee amount
- Button: "Sell YES" or "Sell NO"

**Resolved State:**
- Trade panel transforms into redemption panel
- Shows outcome badge (YES / NO / Invalid)
- Shows user's winning token balance
- Shows claimable USDC amount
- Single "Redeem Winnings" button (emerald, prominent)
- If user has no winning tokens: "No winnings to claim"

### Liquidity Section (Collapsible, Below Trade Panel)

For advanced users. Collapsed by default with "Provide Liquidity" toggle.

```
┌──────────────────────────────┐
│  ▸ Provide Liquidity         │   ← Expandable section
├──────────────────────────────┤
│  Your LP tokens: 45.2       │
│  Pool share: 5.5%           │
│                              │
│  ┌──────┐  ┌──────────┐     │
│  │ ADD  │  │ REMOVE   │     │
│  └──────┘  └──────────┘     │
│                              │
│  Amount (USDC)               │
│  ┌────────────────────┐     │
│  │ 500.00             │     │
│  └────────────────────┘     │
│                              │
│  ┌──────────────────────────┐│
│  │    Add Liquidity →       ││
│  └──────────────────────────┘│
└──────────────────────────────┘
```

### Recent Activity Feed

Below the stats, a chronological list of recent trades:

```
0xab12...ef34  bought  50 YES  @ $0.81    2 min ago
0x5678...9abc  sold   120 NO   @ $0.19    5 min ago
0xdef0...1234  added  $500 liquidity       12 min ago
0x5678...9abc  bought  30 YES  @ $0.79    18 min ago
```

- Color-coded: buys in emerald, sells in rose, LP actions in indigo
- Shortened addresses (clickable → block explorer)
- Relative timestamps

---

## 6. Page 3: Leaderboard

The data backbone — shows real-time Virtuals Protocol agent rankings.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAV BAR                                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Epoch 22 Leaderboard             Ends in 3d 14h 22m              │
│  Last updated: 2 minutes ago                                       │
│                                                                     │
│  ┌──────┬─────────────┬────────┬──────────┬──────┬───────┬───────┐│
│  │ Rank │ Agent       │ Score  │ Revenue  │ Jobs │ Users │ Succ% ││
│  ├──────┼─────────────┼────────┼──────────┼──────┼───────┼───────┤│
│  │ 🥇 1 │ Ethy (ETHY) │ 98.4  │ $45,200  │  892 │   456 │ 94.2% ││
│  │ 🥈 2 │ Clawd (CL)  │ 91.2  │ $38,100  │  734 │   389 │ 92.1% ││
│  │ 🥉 3 │ AgentFi(AFI)│ 87.6  │ $31,400  │  612 │   298 │ 89.7% ││
│  │   4  │ TradeBot    │ 82.1  │ $28,900  │  589 │   267 │ 91.3% ││
│  │   5  │ YieldMax    │ 79.4  │ $25,600  │  501 │   234 │ 88.5% ││
│  │  ... │ ...         │  ...  │  ...     │  ... │   ... │  ...  ││
│  └──────┴─────────────┴────────┴──────────┴──────┴───────┴───────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  📊 Quick Insight: Ethy leads by 7.2 pts. 3 active        │   │
│  │  markets on Ethy this epoch. → View Markets                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Table Features

**Columns:**

| Column | Always Visible | Description |
|--------|---------------|-------------|
| Rank | Yes | Position number. Gold/silver/bronze icons for top 3 |
| Agent | Yes | Name + token symbol in gray |
| Score | Yes | Composite score, right-aligned, monospace |
| Weekly Revenue | Desktop only | USD formatted |
| Job Count | Desktop only | Number formatted |
| Unique Users | Desktop only | Number formatted |
| Success Rate | Large desktop only | Percentage |

**Rank coloring:**
- #1-3: Gold, silver, bronze text or icon
- #4-10: Indigo text (these are "Top 10" eligible)
- #11+: Default gray text

**Row interaction:**
- Hover: highlight row background
- Click: expand row to show full metrics breakdown + link to related markets
- "View Markets" link per agent (filters home feed to that agent's markets)

**Sortable columns:** Click column header to sort by that metric.

**Cross-link to Markets:** A contextual banner below the table showing insight like "Ethy leads by 7.2 pts — 3 markets open on Ethy → View Markets". Drives users from data to action.

---

## 7. Page 4: Portfolio

Requires wallet connection. Shows the user's positions across all markets.

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAV BAR                                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Your Portfolio                                                     │
│                                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │
│  │ Total Value  │ │ Open Pos.    │ │ Available    │               │
│  │ $2,345.67    │ │ $1,890.12    │ │ $455.55 USDC │               │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
│                                                                     │
│  [ Active Positions ]  [ Claimable ]  [ History ]                  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Will Ethy be #1?                    Epoch Winner  │ 2d 7h     ││
│  │                                                               ││
│  │ Position: 50 YES tokens  │  Avg price: $0.65  │  +28.5%     ││
│  │ Current value: $41.75    │  Cost basis: $32.50 │  +$9.25     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Clawd vs AgentFi                   Head-to-Head  │ 2d 7h     ││
│  │                                                               ││
│  │ Position: 200 NO tokens  │  Avg price: $0.30  │  -5.2%      ││
│  │ Current value: $56.80    │  Cost basis: $60.00 │  -$3.20     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ Will DataOracle Top 10?             Top 10  │ RESOLVED: YES   ││
│  │                                                               ││
│  │ 🎉 Claimable: $75.00 USDC                    [ Redeem → ]    ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Summary Bar

Three stat cards at the top:

| Card | Value | Description |
|------|-------|-------------|
| **Total Value** | $2,345.67 | Sum of all position values + available USDC |
| **Open Positions** | $1,890.12 | Market value of all active positions |
| **Available USDC** | $455.55 | Wallet USDC balance |

### Position Tabs

| Tab | Content |
|-----|---------|
| **Active Positions** | Markets where user holds YES, NO, or LP tokens and market is not resolved |
| **Claimable** | Resolved markets where user has winning tokens to redeem. Highlighted with emerald glow |
| **History** | Past positions that have been fully redeemed or exited |

### Position Cards

Each card shows:

- Market question + type badge + time remaining (or resolution status)
- **Position side:** "50 YES tokens" or "200 NO tokens" (colored text)
- **Average price:** What they paid per token
- **Current value:** Current market value based on live price
- **Cost basis:** Total USDC spent
- **P&L:** Percentage and absolute dollar change (green if positive, red if negative)
- **LP positions:** LP token count + pool share percentage (if applicable)

**Claimable positions** get a prominent "Redeem" button and emerald highlight.

**Click behavior:** Navigate to the market detail page.

### Not Connected State

If no wallet is connected:

```
┌──────────────────────────────────────┐
│                                      │
│      Connect your wallet to          │
│      view your portfolio             │
│                                      │
│      [ Connect Wallet ]              │
│                                      │
└──────────────────────────────────────┘
```

---

## 8. Components Library

### Market Type Badge

Small colored pill showing market category.

```
Variants:
  Epoch Winner  →  bg-yellow-500/20, text-yellow-400, border-yellow-500/30
  Top 10        →  bg-blue-500/20, text-blue-400, border-blue-500/30
  Head-to-Head  →  bg-purple-500/20, text-purple-400, border-purple-500/30
  Long Tail     →  bg-green-500/20, text-green-400, border-green-500/30
```

### Probability Bar

Horizontal bar showing YES or NO probability:

```
Props: { side: "YES" | "NO", probability: number }

YES bar → emerald fill, left-to-right, percentage text right-aligned
NO bar  → rose fill, left-to-right, percentage text right-aligned
Width   → percentage of parent container
Animation → width transition (300ms ease-out)
```

### Countdown Timer

Displays remaining time to epoch end.

```
Props: { targetTimestamp: number, compact?: boolean }

Normal:    "3d 14h 22m"
Compact:   "3d 14h"  (for navbar)
Last hour: Red text, pulse animation, "FINAL HOUR" label
Expired:   "Resolving..."
```

### Stat Card

Small card displaying a single metric.

```
Props: { label: string, value: string, sublabel?: string }

┌──────────────┐
│ Total Volume │  ← label (text-xs, gray-400)
│ $12,450      │  ← value (text-lg, white, font-mono)
│ +12% 24h     │  ← sublabel (text-xs, emerald/rose)
└──────────────┘
```

### Trade Button

Context-aware action button.

```
States:
  Not connected  →  gray bg, "Connect Wallet"
  Needs approval →  amber bg, "Approve USDC"
  Buy YES ready  →  emerald bg, "Buy YES →"
  Buy NO ready   →  rose bg, "Buy NO →"
  Sell ready     →  indigo bg, "Sell [side] →"
  Processing     →  muted bg, spinner, "Confirming..."
  Disabled       →  gray bg, reduced opacity, not clickable
```

### Activity Row

Single line showing a trade event.

```
┌────────────────────────────────────────────────────────┐
│ 🟢 0xab12...ef34  bought 50 YES @ $0.81    2 min ago │
└────────────────────────────────────────────────────────┘

Colors:
  Buy   → emerald dot
  Sell  → rose dot
  LP    → indigo dot
```

### Toast Notification

Appears after successful transactions or errors.

```
Success:  ┌ ✓ Trade confirmed! Bought 50 YES tokens ─────── × ┐
Error:    ┌ ✗ Transaction failed. Insufficient USDC balance ─ × ┐
Info:     ┌ ℹ Market resolved: YES wins! Redeem your tokens ─ × ┐

Position: bottom-right
Duration: 5 seconds (auto-dismiss)
Style: dark card with colored left border (emerald/rose/indigo)
```

---

## 9. Design System & Tokens

### Colors

```
Background
  --bg-primary:    #030712    (gray-950, main background)
  --bg-card:       rgba(255,255,255,0.03)   (white/[0.03], card surfaces)
  --bg-card-hover: rgba(255,255,255,0.05)   (white/[0.05], card hover)
  --bg-elevated:   rgba(0,0,0,0.50)         (black/50, modals, overlays)

Text
  --text-primary:   #f9fafb   (white/off-white)
  --text-secondary: #9ca3af   (gray-400)
  --text-muted:     #6b7280   (gray-500)

Brand / Accent
  --accent-primary: #818cf8   (indigo-400, links, active states)
  --accent-hover:   #6366f1   (indigo-500, hover states)
  --accent-strong:  #4f46e5   (indigo-600, buttons, filled elements)

Outcomes
  --yes-color:  #34d399   (emerald-400)
  --yes-bg:     rgba(16,185,129,0.20)   (emerald-500/20)
  --no-color:   #fb7185   (rose-400)
  --no-bg:      rgba(244,63,94,0.20)    (rose-500/20)

Market Types
  --epoch-winner: #facc15   (yellow-400)
  --top-10:       #60a5fa   (blue-400)
  --head-to-head: #a855f7   (purple-500)
  --long-tail:    #4ade80   (green-400)

Alerts
  --alert-color:  #ef4444   (red-500)
  --alert-bg:     rgba(239,68,68,0.10)  (red-500/10)

Borders
  --border-default: rgba(255,255,255,0.10)   (white/10)
  --border-subtle:  rgba(255,255,255,0.05)   (white/5)
```

### Typography

```
Font Family
  Sans:  var(--font-geist-sans)   — UI text, headings, labels
  Mono:  var(--font-geist-mono)   — numbers, prices, addresses, code

Scale                          Usage
  text-xs   (12px)             Labels, timestamps, footnotes
  text-sm   (14px)             Card body text, secondary content
  text-base (16px)             Default body text
  text-lg   (18px)             Section headers, stat values
  text-xl   (20px)             Page subtitles
  text-2xl  (24px)             Page titles
  text-3xl  (30px)             Market question on detail page

Weights
  font-normal  (400)           Body text
  font-medium  (500)           Labels, nav items
  font-semibold (600)          Stat values, prices
  font-bold    (700)           Headings, market questions
```

### Spacing

```
Container:   max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Card padding: p-4 sm:p-6
Grid gaps:    gap-4 (tight), gap-6 (standard), gap-8 (loose)
Section spacing: py-8 or py-12 between major sections
```

### Borders & Radius

```
Radius
  Inputs, small elements:  rounded-lg   (8px)
  Cards, panels:           rounded-xl   (12px)
  Badges, pills:           rounded-full (999px)

Borders
  Default card:  border border-white/10
  Hover card:    border border-white/20
  Active input:  border-indigo-500
  YES active:    border-emerald-500/50
  NO active:     border-rose-500/50
```

### Shadows & Effects

```
Card hover:     shadow-lg shadow-black/20
Modal overlay:  backdrop-blur-xl bg-black/60
Navbar:         backdrop-blur-xl bg-gray-950/80
Glass effect:   bg-white/[0.03] backdrop-blur-sm border-white/10
```

### Motion

```
Transitions
  Colors:     transition-colors duration-200
  All props:  transition-all duration-300
  Scale:      hover:scale-[1.01] transition-transform duration-200

Loading
  Skeleton:   animate-pulse bg-white/10 rounded
  Spinner:    animate-spin (for buttons)
  Countdown:  no animation except color change at <1 hour (pulse)

Bar width
  Probability bars: transition-all duration-500 ease-out
```

---

## 10. Responsive & Mobile

### Breakpoints

```
Mobile:   < 640px    (default, 1-column layouts)
Tablet:   ≥ 640px   (sm: 2-column grids)
Desktop:  ≥ 1024px  (lg: 3-column grids, 2-column detail page)
Wide:     ≥ 1280px  (xl: wider cards, more stats visible)
```

### Mobile-Specific Behavior

**Navigation:**
- Logo + countdown + wallet button always visible
- Nav items collapse into hamburger menu
- Portfolio dot indicator visible on hamburger icon if positions exist

**Home Feed:**
- Featured carousel: 1 card visible, swipeable
- Filter pills: horizontally scrollable
- Market cards: full-width stacked (1 column)

**Market Detail:**
- Single column layout (chart stacks above trade panel)
- Trade panel becomes sticky bottom bar:
  ```
  ┌──────────────────────────────────────┐
  │  YES 81%  │  NO 19%  │  [ Trade → ] │
  └──────────────────────────────────────┘
  ```
- Tapping "Trade" opens trade panel as bottom sheet modal
- Chart timeframe toggles become scrollable

**Leaderboard:**
- Table collapses: only Rank, Agent, Score visible
- Tap row to expand and see full metrics
- Horizontal scroll hint for full table access

**Portfolio:**
- Summary cards stack vertically (1 per row)
- Position cards: full width, P&L prominent

### Touch Targets

- Minimum tap target: 44×44px
- Filter pills: min-height 40px, padding 8px 16px
- Trade buttons: full-width, 48px height
- Card interactions: entire card surface clickable

---

## 11. Wallet & Onboarding Flow

### Connection (MVP — RainbowKit)

```
1. User clicks "Connect Wallet" in navbar
2. RainbowKit modal appears (dark theme, indigo accent)
3. User selects wallet (MetaMask, Coinbase, WalletConnect, etc.)
4. Wallet prompts for connection approval
5. On success: button shows shortened address + Base network badge
6. User can now trade
```

**Connected State in Navbar:**
```
Before:  [ Connect Wallet ]
After:   [ 0xab12...ef34 ▾ ]  (with Base network indicator)
```

### First-Time User Experience

No tutorial modals. No onboarding wizards. The app should be self-explanatory. Instead:

- **Contextual hints** in empty states: "You don't have any positions yet. Browse markets to get started."
- **Inline helper text** on the trade panel: hover-tooltips explaining "Est. shares", "Price impact", etc.
- **CTA placement:** If user is browsing without wallet, show "Connect wallet to trade" where the trade button would be — not as an intrusive modal.

### Network Handling

- If user is on wrong network: show yellow banner at top of page: "Switch to Base network to trade" with a one-click switch button
- Auto-prompt network switch via wagmi's `useSwitchChain`

---

## 12. Interactions & Micro-UX

### Trade Flow (Step by Step)

```
1. User arrives at market detail page
2. Trade panel is pre-set to BUY mode, YES selected
3. User types USDC amount (or clicks MAX)
4. Preview updates in real-time (debounced, ~300ms):
   - Calls calcBuy() on contract
   - Shows estimated shares, avg price, max payout, fee
5. User clicks "Buy YES →"
6. If USDC not approved:
   a. Button shows "Approve USDC" (amber)
   b. User approves in wallet
   c. Wait for tx confirmation
   d. Button switches to "Buy YES →" (emerald)
7. User clicks "Buy YES →"
8. Wallet prompts transaction
9. Button shows spinner + "Confirming..."
10. On success:
    - Toast notification: "Bought 50 YES tokens!"
    - Balances refresh
    - Preview resets
    - Activity feed updates
11. On failure:
    - Toast notification with error message
    - Button returns to ready state
```

### Probability Bar Animation

When market data updates (e.g., after a trade or on poll):
- Bars smoothly animate to new width (CSS transition, 500ms)
- Percentage text updates simultaneously

### Sniping Window (Final Hour)

When `timeRemaining < 3600 seconds`:
- Countdown timer turns red with subtle pulse
- "FINAL HOUR" badge appears next to countdown
- Market cards get red border glow
- Optional: increased polling frequency for price updates

### Keyboard Shortcuts (Power Users)

| Key | Action |
|-----|--------|
| `B` | Switch to BUY mode |
| `S` | Switch to SELL mode |
| `Y` | Select YES outcome |
| `N` | Select NO outcome |
| `Enter` | Confirm trade (when amount entered) |
| `Esc` | Clear amount / close modals |

---

## 13. Empty, Loading & Error States

### Loading States

**Market cards grid:**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  ░░░░░░░░░░  │ │  ░░░░░░░░░░  │ │  ░░░░░░░░░░  │
│  ░░░░░░░     │ │  ░░░░░░░     │ │  ░░░░░░░     │
│  ░░░░░░░░░   │ │  ░░░░░░░░░   │ │  ░░░░░░░░░   │
│  ░░░░░ ░░░░  │ │  ░░░░░ ░░░░  │ │  ░░░░░ ░░░░  │
└──────────────┘ └──────────────┘ └──────────────┘
```
6 skeleton cards with `animate-pulse`. Match card layout proportions.

**Leaderboard table:** 10 skeleton rows, matching column widths.

**Market detail:** Skeleton blocks for chart area, stats, trade panel.

### Empty States

| Context | Message |
|---------|---------|
| No markets exist | "No markets available yet. Check back at the start of next epoch." |
| No markets match filter | "No [type] markets this epoch. Try a different category." |
| Portfolio (no positions) | "No positions yet. Explore markets to start trading." |
| Portfolio (not connected) | "Connect your wallet to view your portfolio." |
| No activity | "No trades yet. Be the first to take a position." |

### Error States

| Context | Message |
|---------|---------|
| API unreachable | "Unable to load data. Please try again." + Retry button |
| Contract read failure | "Error loading market data." + Retry button |
| Transaction failed | Toast: "Transaction failed: [reason]" |
| Wrong network | Yellow banner: "Please switch to Base network" + Switch button |

---

## 14. Accessibility

### Requirements

- **Color contrast:** All text meets WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
- **Focus indicators:** Visible focus rings on all interactive elements (indigo-400 outline)
- **Keyboard navigation:** Full tab-through of all interactive elements
- **Screen readers:** Semantic HTML, ARIA labels on icon-only buttons, live regions for dynamic content (trade preview, countdown)
- **Reduced motion:** Respect `prefers-reduced-motion` — disable pulse animations, reduce transitions

### Semantic HTML

```
<nav>          → Navbar
<main>         → Page content
<article>      → Market card
<section>      → Page sections (filter, grid, stats)
<table>        → Leaderboard
<form>         → Trade panel inputs
<button>       → All clickable actions (not <div onClick>)
<time>         → Countdown, timestamps
```

### ARIA Labels

```html
<button aria-label="Buy YES outcome tokens">Buy YES</button>
<input aria-label="Trade amount in USDC" />
<div role="alert">Transaction confirmed!</div>
<div aria-live="polite">YES: 81%, NO: 19%</div>
```

---

## Quick Reference: Page-by-Page Summary

| Page | URL | Purpose | Key Elements |
|------|-----|---------|--------------|
| **Home Feed** | `/` | Browse & discover markets | Featured carousel, filter pills, sort dropdown, market cards grid |
| **Market Detail** | `/markets/[address]` | Trade a specific market | Header, probability chart, stats, trade panel (sticky), activity feed |
| **Leaderboard** | `/leaderboard` | View agent rankings | Epoch info, sortable table, cross-links to markets |
| **Portfolio** | `/portfolio` | Manage positions | Summary bar, active/claimable/history tabs, position cards |

---

*This spec is the source of truth for building the AGDPBet frontend. When in doubt, reference Polymarket for interaction patterns and adapt to our AI-agent-specific domain.*
