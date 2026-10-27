import React, { useState, useEffect } from "react";
import { fetchSignals } from "../services/api";
import { SignalsResponse, SignalRecord, ContractSpec } from "../types";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Filter,
  Eye,
  Sliders,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";

interface Props {
  contracts: ContractSpec[];
}

export const SignalIntelligenceView: React.FC<Props> = ({ contracts }) => {
  const [symbolA, setSymbolA] = useState("GOLDM");
  const [symbolB, setSymbolB] = useState("GOLDTEN");
  const [zThreshold, setZThreshold] = useState(2.0);
  const [minVolume, setMinVolume] = useState(10);
  const [minOI, setMinOI] = useState(20);
  const [window, setWindow] = useState(20);

  const [loading, setLoading] = useState(false);
  const [signalsData, setSignalsData] = useState<SignalsResponse | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<SignalRecord | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    loadSignals();
  }, [symbolA, symbolB, zThreshold, minVolume, minOI, window]);

  async function loadSignals() {
    setLoading(true);
    try {
      const data = await fetchSignals({
        symbol_a: symbolA,
        symbol_b: symbolB,
        z_threshold: zThreshold,
        min_volume: minVolume,
        min_oi: minOI,
        window: window,
      });
      setSignalsData(data);
      if (data.signals.length > 0) {
        // Select latest unusual or latest signal by default
        const unusual = data.signals.filter((s) => s.is_unusual);
        setSelectedSignal(unusual.length > 0 ? unusual[unusual.length - 1] : data.signals[data.signals.length - 1]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const signals = signalsData?.signals || [];
  const filteredSignals = signals.filter((s) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "UNUSUAL") return s.is_unusual;
    if (statusFilter === "TRADEABLE") return s.is_tradeable;
    if (statusFilter === "RISK") return s.status === "LIQUIDITY_OR_EXPIRY_RISK";
    return s.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Advisory Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            Analytical Signal Intelligence & Defensibility Engine
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-4xl leading-relaxed">
            <strong className="text-slate-200">Critical Core Principle:</strong> A statistical deviation is not automatically a profitable trading opportunity.
            Signals are rigorously filtered through liquidity requirements (volume & open interest minimums),
            contract delivery proximity buffers (physical tender distortions), and rolling history requirements.
          </p>
        </div>
      </div>

      {/* Controls & Threshold Filter Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">Signal Detection Parameters</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Pair:</span>
            <select
              value={symbolA}
              onChange={(e) => setSymbolA(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs rounded-lg px-2.5 py-1.5"
            >
              {contracts.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
              ))}
            </select>
            <span className="text-slate-500 text-xs font-mono">vs</span>
            <select
              value={symbolB}
              onChange={(e) => setSymbolB(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 font-mono text-xs rounded-lg px-2.5 py-1.5"
            >
              {contracts.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <label className="block text-slate-400 mb-1">Z-Score Threshold (σ)</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={zThreshold}
                onChange={(e) => setZThreshold(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="font-bold text-slate-100 w-12 text-right">±{zThreshold.toFixed(1)}σ</span>
            </div>
            <span className="text-[10px] text-slate-500 font-sans">Statistical anomaly cut-off</span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Min Daily Volume</label>
            <input
              type="number"
              min="0"
              value={minVolume}
              onChange={(e) => setMinVolume(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:border-amber-500"
            />
            <span className="text-[10px] text-slate-500 font-sans">Filters thin contracts</span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Min Open Interest (OI)</label>
            <input
              type="number"
              min="0"
              value={minOI}
              onChange={(e) => setMinOI(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:border-amber-500"
            />
            <span className="text-[10px] text-slate-500 font-sans">Execution viability guard</span>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">History Window (Days)</label>
            <input
              type="number"
              min="10"
              max="60"
              value={window}
              onChange={(e) => setWindow(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 focus:border-amber-500"
            />
            <span className="text-[10px] text-slate-500 font-sans">Rolling distribution sample</span>
          </div>
        </div>
      </div>

      {/* Main Split: Signal Inspector & Filterable Signal Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selected Signal Inspector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                Signal Intelligence Inspector
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                Audit Mode
              </span>
            </div>

            {selectedSignal ? (
              <div className="space-y-4 text-xs">
                {/* Status Indicator */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  selectedSignal.status === "UNUSUAL_PREMIUM"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : selectedSignal.status === "UNUSUAL_DISCOUNT"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    : selectedSignal.status === "LIQUIDITY_OR_EXPIRY_RISK"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-slate-800/40 border-slate-700 text-slate-300"
                }`}>
                  {selectedSignal.status === "UNUSUAL_PREMIUM" ? (
                    <TrendingUp className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : selectedSignal.status === "UNUSUAL_DISCOUNT" ? (
                    <TrendingDown className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-sm uppercase tracking-wide">
                      {selectedSignal.status.replace(/_/g, " ")}
                    </div>
                    <div className="text-[11px] font-mono mt-1 opacity-90">
                      Date: {selectedSignal.trade_date} • Z: {selectedSignal.z_score !== null ? `${selectedSignal.z_score.toFixed(2)}σ` : "N/A"}
                    </div>
                  </div>
                </div>

                {/* Analytical Reason */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-sans font-semibold">Analytical Rationale:</div>
                  <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                    {selectedSignal.reason}
                  </p>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500">Spread ₹/10g:</span>
                    <div className="font-bold text-slate-100 mt-0.5">
                      ₹{selectedSignal.absolute_spread.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500">Spread %:</span>
                    <div className="font-bold text-slate-100 mt-0.5">
                      {selectedSignal.percentage_spread.toFixed(3)}%
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500">Confidence Score:</span>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      {(selectedSignal.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-500">History Support:</span>
                    <div className="font-bold text-slate-100 mt-0.5">
                      {selectedSignal.observation_count} obs
                    </div>
                  </div>
                </div>

                {/* Warnings / Risks */}
                {selectedSignal.warnings && selectedSignal.warnings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg space-y-1.5">
                    <div className="text-amber-400 font-bold font-sans text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Execution & Calendar Risks:
                    </div>
                    {selectedSignal.warnings.map((w, i) => (
                      <div key={i} className="text-amber-300 font-mono text-[10px]">
                        • {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tradeability Verdict */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-slate-400 font-sans text-xs">Actionability Assessment:</div>
                  <div className="mt-1 font-semibold text-xs flex items-center gap-1.5">
                    {selectedSignal.is_tradeable ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Statistically defensible and satisfies liquidity filters.
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        Unsuitable for execution due to liquidity, expiry or sample bounds.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 font-mono text-xs">
                Select a signal from the log to inspect details.
              </div>
            )}
          </div>
        </div>

        {/* Signals Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Generated Signals Log ({filteredSignals.length} events)
              </h4>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2 py-0.5 rounded transition ${statusFilter === "ALL" ? "bg-slate-800 text-slate-200 font-bold" : "text-slate-400"}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("UNUSUAL")}
                className={`px-2 py-0.5 rounded transition ${statusFilter === "UNUSUAL" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-slate-400"}`}
              >
                Unusual
              </button>
              <button
                onClick={() => setStatusFilter("TRADEABLE")}
                className={`px-2 py-0.5 rounded transition ${statusFilter === "TRADEABLE" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-slate-400"}`}
              >
                Tradeable
              </button>
              <button
                onClick={() => setStatusFilter("RISK")}
                className={`px-2 py-0.5 rounded transition ${statusFilter === "RISK" ? "bg-rose-500/20 text-rose-300 font-bold" : "text-slate-400"}`}
              >
                Risk Filtered
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[520px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Spread (₹)</th>
                  <th className="py-2.5 px-3">Z-Score</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Confidence</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredSignals.slice().reverse().map((sig) => {
                  const isSelected = selectedSignal?.trade_date === sig.trade_date;
                  return (
                    <tr
                      key={sig.trade_date}
                      onClick={() => setSelectedSignal(sig)}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-amber-500/10 border-l-2 border-amber-400" : "hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-300">{sig.trade_date}</td>
                      <td className={`py-2.5 px-3 font-bold ${sig.absolute_spread >= 0 ? "text-amber-300" : "text-blue-300"}`}>
                        {sig.absolute_spread >= 0 ? "+" : ""}₹{sig.absolute_spread.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        {sig.z_score !== null ? (
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            Math.abs(sig.z_score) >= zThreshold ? "text-rose-400" : "text-slate-400"
                          }`}>
                            {sig.z_score > 0 ? "+" : ""}{sig.z_score.toFixed(2)}σ
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                          sig.status === "UNUSUAL_PREMIUM"
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            : sig.status === "UNUSUAL_DISCOUNT"
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                            : sig.status === "LIQUIDITY_OR_EXPIRY_RISK"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : sig.status === "WATCH"
                            ? "bg-slate-800 text-slate-300"
                            : "text-slate-500"
                        }`}>
                          {sig.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {(sig.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSignal(sig);
                          }}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-sans transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
