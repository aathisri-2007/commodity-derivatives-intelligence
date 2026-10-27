import React, { useState } from "react";
import { TrendingUp, Database, Calendar, ArrowRight, Info, CheckCircle2, RefreshCw, Layers } from "lucide-react";
import { ContractSpec, PriceRecord, DataStatus } from "../types";

interface Props {
  contracts: ContractSpec[];
  dataStatus: DataStatus | null;
  prices: PriceRecord[];
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
}

export const OverviewView: React.FC<Props> = ({ contracts, dataStatus, prices, onNavigate, onRefresh }) => {
  const [normMode, setNormMode] = useState<"challenge" | "weight">("weight");
  const [selectedAuditContract, setSelectedAuditContract] = useState<string | null>(null);

  const latestBySymbol: Record<string, PriceRecord> = {};
  for (const p of prices) {
    if (!latestBySymbol[p.symbol] || p.trade_date > latestBySymbol[p.symbol].trade_date) {
      latestBySymbol[p.symbol] = p;
    }
  }

  const latestDate = dataStatus?.date_coverage.end || "—";
  const benchmarkPrice = latestBySymbol["GOLDM"]
    ? normMode === "challenge"
      ? latestBySymbol["GOLDM"].normalized_close_challenge
      : latestBySymbol["GOLDM"].normalized_close_weight
    : 0;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl text-stone-900 tracking-tight leading-tight">
            Market Overview
          </h1>
          <p className="text-[13px] text-stone-500 mt-2 max-w-2xl leading-relaxed">
            Multi-contract MCX gold intelligence. Every observation is mapped to a standardized{" "}
            <span className="font-mono text-stone-700">10g fine-gold equivalent</span> — normalizing distinct
            quotation bases and purity fineness across GOLDM, GOLDTEN, GOLDGUINEA, and GOLDPETAL.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-md transition card-shadow"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Fine Gold Reference",
            sublabel: "10g equivalent · 999/995",
            value: benchmarkPrice
              ? `₹${benchmarkPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
              : "—",
            icon: TrendingUp,
            accent: "amber" as const,
            footer: latestDate,
          },
          {
            label: "Eligible Contracts",
            sublabel: "GOLDTEN listed 2025+",
            value: `${contracts.length || 4} contracts`,
            icon: Layers,
            accent: "sky" as const,
            footer: "GOLDM · GOLDTEN · GUINEA · PETAL",
          },
          {
            label: "Validated Observations",
            sublabel: "OHLC integrity verified",
            value: dataStatus?.total_validated_prices?.toLocaleString("en-IN") || "—",
            icon: Database,
            accent: "emerald" as const,
            footer: "Deduplicated",
          },
          {
            label: "Coverage Window",
            sublabel: "Unbroken Bhavcopy series",
            value: `${dataStatus?.date_coverage.start || "—"} → ${dataStatus?.date_coverage.end || "—"}`,
            icon: Calendar,
            accent: "stone" as const,
            footer: "Daily settlement",
            small: true,
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          const accentBg = {
            amber: "bg-amber-50 text-amber-700",
            sky: "bg-sky-50 text-sky-700",
            emerald: "bg-emerald-50 text-emerald-700",
            stone: "bg-stone-100 text-stone-700",
          }[kpi.accent];

          return (
            <div
              key={i}
              className="bg-white border border-stone-200/80 rounded-lg p-5 card-shadow hover:card-shadow-hover transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] font-semibold text-stone-500 tracking-wide uppercase">
                    {kpi.label}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5 font-mono">
                    {kpi.sublabel}
                  </div>
                </div>
                <div className={`p-2 rounded-md ${accentBg}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className={`font-mono font-semibold text-stone-900 tabular ${kpi.small ? "text-[13px] mt-3" : "text-2xl"}`}>
                {kpi.value}
              </div>
              <div className="text-[10px] text-stone-400 mt-2 font-mono truncate">
                {kpi.footer}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contract table */}
      <div className="bg-white border border-stone-200/80 rounded-lg overflow-hidden card-shadow">
        <div className="px-6 py-4 border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-stone-900">
              Contract Specifications
            </h2>
            <p className="text-[12px] text-stone-500 mt-0.5">
              Official MCX Bullion Specifications — verified quotation weights & purity fineness.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500 font-medium">Formula:</span>
            <div className="bg-stone-100 p-0.5 rounded-md flex items-center text-[11px] font-mono">
              <button
                onClick={() => setNormMode("weight")}
                className={`px-3 py-1 rounded transition ${
                  normMode === "weight"
                    ? "bg-white text-stone-900 font-semibold shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                P × (10/Q) × F
              </button>
              <button
                onClick={() => setNormMode("challenge")}
                className={`px-3 py-1 rounded transition ${
                  normMode === "challenge"
                    ? "bg-white text-stone-900 font-semibold shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                P × F
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-stone-50/60 border-b border-stone-200/80">
              <tr className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-6">Symbol</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 text-right">Trading Unit</th>
                <th className="py-3 px-4 text-right">Quote Base</th>
                <th className="py-3 px-4 text-right">Purity</th>
                <th className="py-3 px-4 text-right">Quoted Close</th>
                <th className="py-3 px-4 text-right">Factor</th>
                <th className="py-3 px-4 text-right text-amber-800">Norm (10g Fine)</th>
                <th className="py-3 px-4 text-right">Notional</th>
                <th className="py-3 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {contracts.map((c) => {
                const latest = latestBySymbol[c.symbol];
                const quotedClose = latest ? latest.close_price : 0;
                const factor = normMode === "challenge"
                  ? c.standard_conversion_factor
                  : (10.0 / c.quotation_weight_grams) * c.purity_fineness;
                const normPrice = latest
                  ? normMode === "challenge"
                    ? latest.normalized_close_challenge
                    : latest.normalized_close_weight
                  : 0;
                const notional = latest ? latest.contract_notional_value : 0;

                return (
                  <tr key={c.symbol} className="hover:bg-stone-50/40 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        <span className="font-semibold text-stone-900 font-mono">{c.symbol}</span>
                        {c.symbol === "GOLDTEN" && (
                          <span className="text-[9px] font-medium px-1.5 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded">
                            2025+
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">{c.name}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-stone-700 tabular">
                      {c.trading_unit_grams}g
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-stone-700 tabular">
                      {c.quotation_weight_grams}g
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-stone-700 tabular">
                      {c.purity_fineness}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-stone-800 tabular">
                      {quotedClose ? `₹${quotedClose.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-stone-500 tabular text-[11px]">
                      ×{factor.toFixed(5)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-800 tabular bg-amber-50/30">
                      {normPrice ? `₹${normPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-stone-700 tabular">
                      {notional ? `₹${notional.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => setSelectedAuditContract(c.symbol)}
                        className="text-[11px] text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-2 py-1 rounded transition"
                      >
                        Audit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            tab: "comparison",
            tag: "Relative Value",
            title: "Cross-Contract Analysis",
            desc: "Compare normalized prices, compute rolling spreads, and view statistical Z-score divergence between any two gold contracts.",
            accent: "amber",
          },
          {
            tab: "historical",
            tag: "Time Series",
            title: "Term Structure & Carry",
            desc: "Inspect futures curves, track annualized carry rates, and separate mechanical roll convergence from genuine alpha.",
            accent: "sky",
          },
          {
            tab: "backtesting",
            tag: "Research",
            title: "Walk-Forward Backtesting",
            desc: "Strict out-of-sample validation. Evaluates whether signals survive statutory fees, CTT, GST, and execution slippage.",
            accent: "emerald",
          },
        ].map((card) => (
          <button
            key={card.tab}
            onClick={() => onNavigate(card.tab)}
            className="group bg-white border border-stone-200/80 hover:border-stone-300 rounded-lg p-5 text-left transition-all card-shadow hover:card-shadow-hover"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                {card.tag}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="font-display text-lg text-stone-900 leading-tight mb-2">
              {card.title}
            </div>
            <div className="text-[12px] text-stone-500 leading-relaxed">
              {card.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Audit modal */}
      {selectedAuditContract && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/30 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedAuditContract(null)}
        >
          <div
            className="bg-white rounded-xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Normalization Audit
                </div>
                <h3 className="font-display text-2xl text-stone-900 mt-0.5">
                  {selectedAuditContract}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditContract(null)}
                className="text-stone-400 hover:text-stone-700 text-lg font-mono px-2 py-1 rounded hover:bg-stone-100 transition"
              >
                ✕
              </button>
            </div>

            {(() => {
              const spec = contracts.find((c) => c.symbol === selectedAuditContract);
              const latest = latestBySymbol[selectedAuditContract];
              const p = latest ? latest.close_price : 72000;
              const q = spec?.quotation_weight_grams || 10;
              const f = spec?.purity_fineness || 0.995;
              const unit = spec?.trading_unit_grams || 100;
              const norm = p * (10 / q) * f;
              const notional = p * (unit / q);

              return (
                <div className="space-y-4 text-[12px] font-mono">
                  <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-800 mb-1.5">
                      Formula
                    </div>
                    <div className="text-amber-900 font-semibold text-[13px]">
                      Normalized = P × (10 / Q) × F
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: "Quoted Price (P)", v: `₹${p.toLocaleString("en-IN")}` },
                      { l: "Quotation Weight (Q)", v: `${q}g` },
                      { l: "Fineness (F)", v: `${f} (${(f * 100).toFixed(1)}%)` },
                      { l: "Trading Unit", v: `${unit}g` },
                    ].map((x, i) => (
                      <div key={i} className="bg-stone-50 border border-stone-200 rounded-md p-3">
                        <div className="text-[10px] text-stone-500 uppercase tracking-wider">{x.l}</div>
                        <div className="text-[14px] font-semibold text-stone-900 mt-1 tabular">{x.v}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-md p-4 space-y-1.5 text-[11px] text-stone-700">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-2">
                      Calculation
                    </div>
                    <div>1. Weight multiplier = 10 / {q} = <span className="font-semibold">{(10 / q).toFixed(4)}</span></div>
                    <div>2. Fineness factor = <span className="font-semibold">{f}</span></div>
                    <div>3. Combined = {((10 / q) * f).toFixed(5)}</div>
                    <div className="pt-2 mt-2 border-t border-stone-200 text-emerald-800 font-semibold">
                      Normalized = ₹{p.toLocaleString("en-IN")} × {((10 / q) * f).toFixed(5)} = ₹{norm.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sky-800 pt-1">
                      Notional = ₹{notional.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};