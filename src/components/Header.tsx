import React from "react";
import { RefreshCw } from "lucide-react";
import { DataStatus, PriceRecord } from "../types";

interface Props {
  dataStatus: DataStatus | null;
  onRefresh: () => void;
  activeTab: string;
  prices: PriceRecord[];
}

export const Header: React.FC<Props> = ({ dataStatus, onRefresh, activeTab, prices }) => {
  const latestDate = dataStatus?.date_coverage?.end || "—";
  const totalRecords = dataStatus?.total_validated_prices || 0;

  const tabTitles: Record<string, { eyebrow: string; title: string }> = {
    overview:    { eyebrow: "Market Overview",  title: "Gold Contracts & Quotations" },
    comparison:  { eyebrow: "Relative Value",   title: "Cross-Contract Analysis" },
    historical:  { eyebrow: "Time Series",      title: "Term Structure & Carry" },
    signals:     { eyebrow: "Intelligence",     title: "Signal Detection" },
    backtesting: { eyebrow: "Research",         title: "Walk-Forward Backtesting" },
    data:        { eyebrow: "System",           title: "Data Management" },
    methodology: { eyebrow: "Documentation",    title: "Methodology & Specifications" },
  };

  const current = tabTitles[activeTab] || { eyebrow: "Analysis", title: "Derivatives Intelligence" };

  const tickers = React.useMemo(() => {
    const bySymbol: Record<string, PriceRecord[]> = {};
    for (const p of prices) {
      if (!bySymbol[p.symbol]) bySymbol[p.symbol] = [];
      bySymbol[p.symbol].push(p);
    }
    const order = ["GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"];
    return order.map((sym) => {
      const records = (bySymbol[sym] || []).slice().sort((a, b) =>
        a.trade_date.localeCompare(b.trade_date)
      );
      if (records.length === 0) return { symbol: sym, price: null, deltaPct: null };
      const latest = records[records.length - 1];
      const prev = records.length >= 2 ? records[records.length - 2] : null;
      const deltaPct =
        prev && prev.close_price > 0
          ? ((latest.close_price - prev.close_price) / prev.close_price) * 100
          : null;
      return { symbol: sym, price: latest.close_price, deltaPct };
    });
  }, [prices]);

  return (
    <header className="bg-white border-b border-stone-200/80 sticky top-0 z-30">
      {/* Top row */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-display text-base tracking-tight">Au</span>
            </div>
            <div className="leading-tight">
              <div className="text-[10px] text-stone-500 font-medium tracking-[0.12em] uppercase">
                {current.eyebrow}
              </div>
              <div className="text-[15px] text-stone-900 font-semibold tracking-tight">
                {current.title}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-6 border-l border-stone-200">
            <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">MCX</span>
            <span className="text-[10px] text-stone-300">•</span>
            <span className="text-[11px] text-stone-500 font-mono">{latestDate}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/60 rounded-md text-[10px] font-mono">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-emerald-700 font-medium">LIVE</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-stone-50 border border-stone-200 rounded-md text-[11px] font-mono">
            <span className="text-stone-500">Observations</span>
            <span className="text-stone-900 font-semibold tabular">
              {totalRecords.toLocaleString("en-IN")}
            </span>
          </div>

          <button
            onClick={onRefresh}
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-md transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ticker strip */}
      <div className="px-6 py-2 flex items-center gap-8 overflow-x-auto bg-stone-50/50 border-t border-stone-200/60">
        {tickers.map((t) => (
          <div key={t.symbol} className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="text-[11px] font-semibold text-stone-700 font-mono tracking-tight">
              {t.symbol}
            </span>
            <span className="text-[12px] font-mono text-stone-900 tabular">
              {t.price !== null
                ? `₹${t.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                : "—"}
            </span>
            {t.deltaPct !== null && (
              <span
                className={`text-[10px] font-mono tabular font-medium ${
                  t.deltaPct >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {t.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(t.deltaPct).toFixed(2)}%
              </span>
            )}
            <span className="text-[10px] text-stone-300">│</span>
          </div>
        ))}
      </div>
    </header>
  );
};