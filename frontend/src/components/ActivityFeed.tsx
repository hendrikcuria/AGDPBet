"use client";

interface ActivityItem {
  id: string;
  address: string;
  action: "buy" | "sell" | "lp";
  side?: "YES" | "NO";
  amount: number;
  price?: number;
  timestamp: number;
}

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Mock activity for now — no event indexer yet
const mockActivity: ActivityItem[] = [
  { id: "a1", address: "0xab12cd34ef56ab12cd34ef56ab12cd34ef56ab12", action: "buy", side: "YES", amount: 50, price: 0.81, timestamp: Date.now() - 2 * 60000 },
  { id: "a2", address: "0xc3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4", action: "sell", side: "NO", amount: 120, price: 0.19, timestamp: Date.now() - 5 * 60000 },
  { id: "a3", address: "0xdef01234abcdef01234abcdef01234abcdef012345", action: "lp", amount: 500, timestamp: Date.now() - 12 * 60000 },
  { id: "a4", address: "0xc3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4", action: "buy", side: "YES", amount: 30, price: 0.79, timestamp: Date.now() - 18 * 60000 },
];

export default function ActivityFeed({ items }: { items?: ActivityItem[] }) {
  const data = items || mockActivity;

  const dotColor = (action: string) => {
    if (action === "buy") return "bg-emerald-400";
    if (action === "sell") return "bg-rose-400";
    return "bg-indigo-400";
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
      <h3 className="text-white text-sm mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.id} className="flex items-center gap-3 text-xs">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor(item.action)}`} />
            <span className="text-gray-400 font-mono">{shortenAddr(item.address)}</span>
            <span className="text-gray-500">
              {item.action === "lp" ? "added" : item.action === "buy" ? "bought" : "sold"}
            </span>
            {item.side && (
              <span className={item.side === "YES" ? "text-emerald-400" : "text-rose-400"}>
                {item.amount} {item.side}
              </span>
            )}
            {!item.side && <span className="text-white">${item.amount.toLocaleString()} liquidity</span>}
            {item.price && <span className="text-gray-600">@ ${item.price.toFixed(2)}</span>}
            <span className="text-gray-600 ml-auto">{timeAgo(item.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
