import { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { defaultChartOptions } from "../utils/chartSetup";
import { fetchComparison } from "../services/api";
import type { ComparisonResult, ContractSpec } from "../types";
import { ArrowUpDown, Download, AlertCircle } from "lucide-react";

interface Props {
  contracts: ContractSpec[];
}

export function ContractComparisonView({ contracts }: Props) {
  const [symbolA, setSymbolA] = useState("GOLDM");
  const [symbolB, setSymbolB] = useState("GOLDTEN");
  const [rollingWindow, setRollingWindow] = useState(20);
  const [normMode, setNormMode] = useState("physical_weight");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [activeTab, setActiveTab] = useState<"prices" | "spread" | "pct">("spread");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  useEffect(() => {
    loadComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolA, symbolB, rollingWindow, normMode]);

  async function loadComparison() {
    if (symbolA === symbolB) {
      setError("Please select two distinct contracts.");
      setComparison(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchComparison({
        symbol_a: symbolA,
        symbol_b: symbolB,
        window: rollingWindow,
        norm_mode: normMode,
      });
      setComparison(data);
      setCurrentPage(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load comparison";
      setError(msg);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSwap() {
    const a = symbolA;
    setSymbolA(symbolB);
    setSymbolB(a);
  }

  const series = comparison?.series ?? [];
  const labels = series.map((s) => s.trade_date);

  const priceChartData = {
    labels,
    datasets: [
      {
        label: `${symbolA} (Norm ₹/10g)`,
        data: series.map((s) => s.norm_price_a),
        borderColor: "#92400E",
        backgroundColor: "rgba(146, 64, 14, 0.06)",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
      },
      {
        label: `${symbolB} (Norm ₹/10g)`,
        data: series.map((s) => s.norm_price_b),
        borderColor: "#0369A1",
        backgroundColor: "rgba(3, 105, 161, 0.06)",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  };

  const spreadChartData = {
    labels,
    datasets: [
      {
        label: `Spread (${symbolA} − ${symbolB}) ₹/10g`,
        data: series.map((s) => s.absolute_spread),
        borderColor: "#B45309",
        backgroundColor: "rgba(180, 83, 9, 0.08)",
        fill: true,
        borderWidth: 1.8,
        pointRadius: 0,
      },
      {
        label: `${rollingWindow}-Day Rolling Mean`,
        data: series.map((s) => s.rolling_mean),
        borderColor: "#78716C",
        borderDash: [4, 4],
        borderWidth: 1.2,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const pctChartData = {
    labels,
    datasets: [
      {
        label: `Relative % (${symbolA} vs ${symbolB})`,
        data: series.map((s) => s.percentage_spread),
        borderColor: "#047857",
        backgroundColor: "rgba(4, 120, 87, 0.08)",
        fill: true,
        borderWidth: 1.8,
        pointRadius: 0,
      },
    ],
  };

  const latestObs = series.length > 0 ? series[series.length - 1] : null;
  const totalPages = Math.max(1, Math.ceil(series.length / rowsPerPage));
  const currentRows = series
    .slice()
    .reverse()
    .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  function exportCSV() {
    if (!series.length) return;
    const headers = [
      "TradeDate", "ExpiryA", "ExpiryB",
      `RawPrice_${symbolA}`, `RawPrice_${symbolB}`,
      `NormPrice_${symbolA}`, `NormPrice_${symbolB}`,
      "AbsoluteSpread_INR", "PercentageSpread_PCT",
      "RollingMean", "RollingStd", "ZScore",
    ];
    const rows = series.map((s) => [
      s.trade_date, s.expiry_a, s.expiry_b,
      s.raw_price_a, s.raw_price_b, s.norm_price_a, s.norm_price_b,
      s.absolute_spread, s.percentage_spread,
      s.rolling_mean ?? "", s.rolling_std ?? "", s.z_score ?? "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `mcx_${symbolA}_vs_${symbolB}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-stone-900 tracking-tight leading-tight">
          Cross-Contract Comparison
        </h1>
        <p className="text-[13px] text-stone-500 mt-2 max-w-2xl leading-relaxed">
          Normalized prices and statistical spreads between any two MCX gold contracts.
          Rolling metrics computed with strict no-lookahead bias.
        </p>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-lg p-5 card-shadow">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Contract A
              </label>
              <select
                value={symbolA}
                onChange={(e) => setSymbolA(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-stone-900 font-mono font-medium text-[12px] rounded-md px-3 py-2 hover:border-stone-400 transition"
              >
                {contracts.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.symbol} ({c.trading_unit_grams}g / {c.purity_fineness})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSwap}
              className="mb-1 p-2 bg-stone-50 hover:bg-stone-100 border border-stone-300 text-stone-600 rounded-md transition"
              title="Swap"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>

            <div>
              <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Contract B
              </label>
              <select
                value={symbolB}
                onChange={(e) => setSymbolB(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-stone-900 font-mono font-medium text-[12px] rounded-md px-3 py-2 hover:border-stone-400 transition"
              >
                {contracts.map((c) => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.symbol} ({c.trading_unit_grams}g / {c.purity_fineness})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Window
              </label>
              <select
                value={rollingWindow}
                onChange={(e) => setRollingWindow(Number(e.target.value))}
                className="bg-stone-50 border border-stone-300 text-stone-800 font-mono text-[12px] rounded-md px-3 py-2"
              >
                <option value={10}>10 days</option>
                <option value={20}>20 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                Formula
              </label>
              <select
                value={normMode}
                onChange={(e) => setNormMode(e.target.value)}
                className="bg-stone-50 border border-stone-300 text-stone-800 font-mono text-[12px] rounded-md px-3 py-2"
              >
                <option value="physical_weight">P × (10/Q) × F</option>
                <option value="challenge_baseline">P × F</option>
              </select>
            </div>

            <button
              onClick={exportCSV}
              disabled={!series.length}
              className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded-md transition disabled:opacity-40 card-shadow"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-[12px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {latestObs && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
            <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Latest Spread</div>
            <div className="font-mono font-semibold text-[15px] text-amber-800 mt-1.5 tabular">
              ₹{latestObs.absolute_spread.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono">{latestObs.percentage_spread.toFixed(3)}%</div>
          </div>
          <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
            <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Rolling Mean</div>
            <div className="font-mono font-semibold text-[15px] text-stone-900 mt-1.5 tabular">
              {latestObs.rolling_mean !== null ? `₹${latestObs.rolling_mean.toFixed(2)}` : "—"}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono">{rollingWindow}-day</div>
          </div>
          <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
            <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Rolling σ</div>
            <div className="font-mono font-semibold text-[15px] text-stone-900 mt-1.5 tabular">
              {latestObs.rolling_std !== null ? `₹${latestObs.rolling_std.toFixed(2)}` : "—"}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono">Volatility</div>
          </div>
          <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
            <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Z-Score</div>
            <div
              className={`font-mono font-semibold text-[15px] mt-1.5 tabular ${
                latestObs.z_score !== null && Math.abs(latestObs.z_score) >= 2
                  ? "text-rose-700"
                  : latestObs.z_score !== null && Math.abs(latestObs.z_score) >= 1.5
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {latestObs.z_score !== null
                ? `${latestObs.z_score > 0 ? "+" : ""}${latestObs.z_score.toFixed(2)}σ`
                : "—"}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono">
              {latestObs.z_score !== null && Math.abs(latestObs.z_score) >= 2 ? "Unusual" : "Within band"}
            </div>
          </div>
          <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
            <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Paired Days</div>
            <div className="font-mono font-semibold text-[15px] text-stone-900 mt-1.5 tabular">
              {comparison?.total_paired_observations ?? 0}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono">Matched</div>
          </div>
          <div className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
            <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Expiries</div>
            <div className="font-mono font-semibold text-[11px] text-stone-900 mt-1.5 truncate tabular">
              {latestObs.expiry_a}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5 font-mono truncate">vs {latestObs.expiry_b}</div>
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200/80 rounded-lg p-6 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-200/80">
          <div>
            <h2 className="font-display text-xl text-stone-900">
              {symbolA} vs {symbolB}
            </h2>
            <p className="text-[12px] text-stone-500 mt-0.5">
              Normalized to 10g fine-gold · {normMode === "physical_weight" ? "P × (10/Q) × F" : "P × F"}
            </p>
          </div>
          <div className="bg-stone-100 p-0.5 rounded-md flex items-center text-[11px] font-mono">
            {[
              { id: "spread" as const, label: "Spread ₹" },
              { id: "pct" as const, label: "Spread %" },
              { id: "prices" as const, label: "Prices" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1 rounded transition ${
                  activeTab === t.id
                    ? "bg-white text-stone-900 font-semibold shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80 w-full relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-[12px] font-mono">
              Computing...
            </div>
          ) : series.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 text-[12px]">
              <AlertCircle className="w-6 h-6 mb-2 text-stone-300" />
              <span>No overlapping observations for {symbolA} and {symbolB}.</span>
            </div>
          ) : activeTab === "spread" ? (
            <Line data={spreadChartData as any} options={defaultChartOptions as any} />
          ) : activeTab === "pct" ? (
            <Line data={pctChartData as any} options={defaultChartOptions as any} />
          ) : (
            <Line data={priceChartData as any} options={defaultChartOptions as any} />
          )}
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-lg overflow-hidden card-shadow">
        <div className="px-6 py-4 border-b border-stone-200/80">
          <h2 className="font-display text-lg text-stone-900">Paired Observations</h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {series.length} records · page {currentPage} of {totalPages}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-stone-50/60 border-b border-stone-200/80">
              <tr className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-6">Date</th>
                <th className="py-3 px-4">Expiry A</th>
                <th className="py-3 px-4">Expiry B</th>
                <th className="py-3 px-4 text-right">{symbolA}</th>
                <th className="py-3 px-4 text-right">{symbolB}</th>
                <th className="py-3 px-4 text-right text-amber-800">Spread</th>
                <th className="py-3 px-4 text-right">%</th>
                <th className="py-3 px-4 text-right">Mean</th>
                <th className="py-3 px-4 text-right">Z-Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {currentRows.map((row) => (
                <tr key={`${row.trade_date}-${row.expiry_a}-${row.expiry_b}`} className="hover:bg-stone-50/60 transition">
                  <td className="py-2.5 px-6 text-stone-900 font-mono font-medium tabular">{row.trade_date}</td>
                  <td className="py-2.5 px-4 text-stone-500 font-mono tabular">{row.expiry_a}</td>
                  <td className="py-2.5 px-4 text-stone-500 font-mono tabular">{row.expiry_b}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-stone-800 tabular">
                    ₹{row.norm_price_a.toLocaleString("en-IN")}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-stone-800 tabular">
                    ₹{row.norm_price_b.toLocaleString("en-IN")}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono font-semibold tabular ${
                      row.absolute_spread >= 0 ? "text-amber-800" : "text-sky-700"
                    }`}
                  >
                    {row.absolute_spread >= 0 ? "+" : ""}₹{row.absolute_spread.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-stone-600 tabular">
                    {row.percentage_spread.toFixed(3)}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-stone-500 tabular">
                    {row.rolling_mean !== null ? `₹${row.rolling_mean.toFixed(2)}` : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {row.z_score !== null ? (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tabular ${
                          Math.abs(row.z_score) >= 2
                            ? "bg-rose-50 text-rose-700"
                            : Math.abs(row.z_score) >= 1.5
                            ? "bg-amber-50 text-amber-800"
                            : "text-stone-500"
                        }`}
                      >
                        {row.z_score > 0 ? "+" : ""}
                        {row.z_score.toFixed(2)}σ
                      </span>
                    ) : (
                      <span className="text-stone-400 text-[10px]">warming</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-stone-200/80 flex items-center justify-between font-mono text-[11px] text-stone-500">
            <div>
              {series.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}–
              {Math.min(currentPage * rowsPerPage, series.length)} of {series.length}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-white hover:bg-stone-50 disabled:opacity-30 border border-stone-300 rounded text-stone-700 transition"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-white hover:bg-stone-50 disabled:opacity-30 border border-stone-300 rounded text-stone-700 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContractComparisonView;