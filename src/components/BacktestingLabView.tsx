import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import { defaultChartOptions } from "../utils/chartSetup";
import { runBacktest } from "../services/api";
import { BacktestResponse, ContractSpec } from "../types";
import { Play, Sliders, ShieldCheck, Award, Lock } from "lucide-react";

interface Props {
  contracts: ContractSpec[];
}

export const BacktestingLabView: React.FC<Props> = ({ contracts }) => {
  const [symbolA, setSymbolA] = useState("GOLDM");
  const [symbolB, setSymbolB] = useState("GOLDTEN");
  const [zEntry, setZEntry] = useState(2.0);
  const [zExit, setZExit] = useState(0.5);
  const [rollingWindow, setRollingWindow] = useState(20);
  const [brokerage, setBrokerage] = useState(20.0);
  const [slippageBps, setSlippageBps] = useState(2.0);
  const [initialCapital] = useState(500000.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResponse | null>(null);
  const [selectedPeriodTab, setSelectedPeriodTab] = useState<"test" | "val" | "train">("test");

  async function handleRunBacktest() {
    setLoading(true);
    setError(null);
    try {
      const res = await runBacktest({
        symbol_a: symbolA,
        symbol_b: symbolB,
        z_entry_threshold: zEntry,
        z_exit_threshold: zExit,
        rolling_window: rollingWindow,
        brokerage_per_lot: brokerage,
        slippage_basis_points: slippageBps,
        initial_capital: initialCapital,
      });
      setBacktestResult(res);
      setSelectedPeriodTab("test");
    } catch (e: any) {
      setError(e.message || "Backtest failed");
    } finally {
      setLoading(false);
    }
  }

  const activePeriod = backtestResult
    ? selectedPeriodTab === "test"
      ? backtestResult.unseen_test_results
      : selectedPeriodTab === "val"
      ? backtestResult.validation_results
      : backtestResult.training_results
    : null;

  const equityCurve = activePeriod?.equity_curve || [];
  const chartData = {
    labels: equityCurve.map((e) => e.date),
    datasets: [
      {
        label: "Strategy (Net of Friction)",
        data: equityCurve.map((e) => e.equity),
        borderColor: "#B45309",
        backgroundColor: "rgba(180, 83, 9, 0.06)",
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
      },
      {
        label: "Gold Buy & Hold",
        data: equityCurve.map((e) => e.gold_benchmark),
        borderColor: "#78716C",
        borderDash: [5, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-stone-900 tracking-tight leading-tight">
          Walk-Forward Backtesting
        </h1>
        <p className="text-[13px] text-stone-500 mt-2 max-w-2xl leading-relaxed">
          Chronological 60/20/20 split. Parameters frozen before unseen test evaluation.
          All statutory fees, CTT, GST, brokerage, and slippage deducted.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-4 flex items-start gap-3">
        <div className="p-1.5 bg-amber-100 text-amber-800 rounded-md shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[12px] font-semibold text-stone-900">
            Zero Look-Ahead Bias Protocol
          </div>
          <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
            Data is partitioned chronologically. Strategy parameters are frozen before the unseen
            test period is evaluated. Round-trip trading friction is deducted from net P&L.
          </p>
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-lg p-5 card-shadow space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-700" />
            <h2 className="text-[13px] font-semibold text-stone-900">Parameters</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-500 font-mono">Pair:</span>
            <select
              value={symbolA}
              onChange={(e) => setSymbolA(e.target.value)}
              className="bg-stone-50 border border-stone-300 text-stone-800 font-mono text-[12px] rounded-md px-2.5 py-1.5"
            >
              {contracts.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
              ))}
            </select>
            <span className="text-stone-400 text-[11px]">vs</span>
            <select
              value={symbolB}
              onChange={(e) => setSymbolB(e.target.value)}
              className="bg-stone-50 border border-stone-300 text-stone-800 font-mono text-[12px] rounded-md px-2.5 py-1.5"
            >
              {contracts.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-[12px] font-mono">
          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Z Entry / Exit
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                value={zEntry}
                onChange={(e) => setZEntry(Number(e.target.value))}
                className="bg-stone-50 border border-stone-300 text-stone-800 rounded px-2 py-1.5 tabular"
              />
              <input
                type="number"
                step="0.1"
                value={zExit}
                onChange={(e) => setZExit(Number(e.target.value))}
                className="bg-stone-50 border border-stone-300 text-stone-800 rounded px-2 py-1.5 tabular"
              />
            </div>
            <span className="text-[10px] text-stone-400 mt-1 block">±{zEntry}σ entry</span>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Slippage (bps)
            </label>
            <input
              type="number"
              step="0.5"
              value={slippageBps}
              onChange={(e) => setSlippageBps(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-300 text-stone-800 rounded px-3 py-1.5 tabular"
            />
            <span className="text-[10px] text-stone-400 mt-1 block">Bid-ask execution</span>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Brokerage (₹)
            </label>
            <input
              type="number"
              value={brokerage}
              onChange={(e) => setBrokerage(Number(e.target.value))}
              className="w-full bg-stone-50 border border-stone-300 text-stone-800 rounded px-3 py-1.5 tabular"
            />
            <span className="text-[10px] text-stone-400 mt-1 block">Per contract lot</span>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
              Capital Base
            </label>
            <div className="bg-stone-100 border border-stone-300 text-stone-700 rounded px-3 py-1.5 tabular">
              ₹{initialCapital.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-stone-500 font-mono">
            Chronological split: 60% Train / 20% Val / 20% Unseen
          </div>
          <button
            onClick={handleRunBacktest}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium text-[12px] rounded-md transition shadow-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? "Simulating..." : "Run Backtest"}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-[12px]">
            {error}
          </div>
        )}
      </div>

      {backtestResult && (
        <div className="space-y-6">
          <div
            className={`p-5 rounded-lg border flex items-start gap-4 ${
              backtestResult.edge_survived_costs
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <Award className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider">
                Research Finding
              </div>
              <p className="text-[12px] leading-relaxed mt-1">{backtestResult.analytical_synthesis}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-stone-500">Dataset:</span>
              <div className="bg-stone-100 p-0.5 rounded-md flex items-center text-[11px] font-mono">
                <button
                  onClick={() => setSelectedPeriodTab("test")}
                  className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                    selectedPeriodTab === "test"
                      ? "bg-white text-stone-900 font-semibold shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  Unseen Test
                </button>
                <button
                  onClick={() => setSelectedPeriodTab("val")}
                  className={`px-3 py-1 rounded transition ${
                    selectedPeriodTab === "val"
                      ? "bg-white text-stone-900 font-semibold shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  Validation
                </button>
                <button
                  onClick={() => setSelectedPeriodTab("train")}
                  className={`px-3 py-1 rounded transition ${
                    selectedPeriodTab === "train"
                      ? "bg-white text-stone-900 font-semibold shadow-sm"
                      : "text-stone-500"
                  }`}
                >
                  Training
                </button>
              </div>
            </div>
            <div className="text-[11px] font-mono text-stone-500">
              {activePeriod?.date_range.start} → {activePeriod?.date_range.end}
            </div>
          </div>

          {activePeriod && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
                <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Gross P&L</div>
                <div className={`font-mono font-semibold text-[14px] mt-1.5 tabular ${
                  activePeriod.gross_pnl_inr >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}>
                  ₹{activePeriod.gross_pnl_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
                <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Friction</div>
                <div className="font-mono font-semibold text-[14px] text-rose-700 mt-1.5 tabular">
                  −₹{activePeriod.total_friction_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
                <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Net P&L</div>
                <div className={`font-mono font-semibold text-[14px] mt-1.5 tabular ${
                  activePeriod.net_pnl_inr >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}>
                  ₹{activePeriod.net_pnl_inr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5 font-mono">{activePeriod.strategy_return_pct}%</div>
              </div>
              <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
                <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Win Rate</div>
                <div className="font-mono font-semibold text-[14px] text-stone-900 mt-1.5 tabular">
                  {activePeriod.win_rate_pct}%
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5 font-mono">
                  {activePeriod.winning_trades}W / {activePeriod.losing_trades}L
                </div>
              </div>
              <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
                <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Max DD</div>
                <div className="font-mono font-semibold text-[14px] text-rose-700 mt-1.5 tabular">
                  {activePeriod.max_drawdown_pct.toFixed(2)}%
                </div>
              </div>
              <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
                <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Gold Benchmark</div>
                <div className="font-mono font-semibold text-[14px] text-sky-700 mt-1.5 tabular">
                  {activePeriod.unhedged_gold_benchmark_return_pct.toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-stone-200/80 rounded-lg p-6 card-shadow">
            <div className="pb-4 mb-4 border-b border-stone-200/80">
              <h2 className="font-display text-xl text-stone-900">
                Performance vs Gold Benchmark
              </h2>
              <p className="text-[12px] text-stone-500 mt-0.5">
                Isolates spread-strategy alpha from secular gold appreciation.
              </p>
            </div>
            <div className="h-80 w-full">
              <Line data={chartData as any} options={defaultChartOptions as any} />
            </div>
          </div>

          {activePeriod && activePeriod.trades.length > 0 && (
            <div className="bg-white border border-stone-200/80 rounded-lg overflow-hidden card-shadow">
              <div className="px-6 py-4 border-b border-stone-200/80">
                <h2 className="font-display text-lg text-stone-900">
                  Trade Log ({activePeriod.trades.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-stone-50/60 border-b border-stone-200/80">
                    <tr className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Entry</th>
                      <th className="py-3 px-4">Exit</th>
                      <th className="py-3 px-4">Position</th>
                      <th className="py-3 px-4 text-right">Entry Z</th>
                      <th className="py-3 px-4 text-right">Exit Z</th>
                      <th className="py-3 px-4 text-right">Gross</th>
                      <th className="py-3 px-4 text-right text-rose-700">Friction</th>
                      <th className="py-3 px-4 text-right">Net</th>
                      <th className="py-3 px-4 text-right">Hold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {activePeriod.trades.map((t, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/60 transition">
                        <td className="py-2.5 px-4 text-stone-700 font-mono tabular">{t.entry_date}</td>
                        <td className="py-2.5 px-4 text-stone-700 font-mono tabular">{t.exit_date}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                              t.position_type.includes("Long A")
                                ? "bg-sky-50 text-sky-700"
                                : "bg-violet-50 text-violet-700"
                            }`}
                          >
                            {t.position_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-stone-600 tabular">{t.entry_z.toFixed(2)}σ</td>
                        <td className="py-2.5 px-4 text-right font-mono text-stone-600 tabular">{t.exit_z.toFixed(2)}σ</td>
                        <td className={`py-2.5 px-4 text-right font-mono tabular ${t.gross_pnl >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          ₹{t.gross_pnl.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-700 tabular">−₹{t.friction_costs.toFixed(2)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-semibold tabular ${t.net_pnl >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          ₹{t.net_pnl.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-stone-500 tabular">{t.holding_days}d</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};