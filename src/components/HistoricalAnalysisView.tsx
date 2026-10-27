import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { defaultChartOptions } from "../utils/chartSetup";
import { fetchComparison, fetchTermStructure } from "../services/api";
import { ComparisonResult, TermStructureData, ContractSpec } from "../types";
import { Calendar, Info, AlertTriangle } from "lucide-react";

interface Props {
  contracts: ContractSpec[];
}

export const HistoricalAnalysisView: React.FC<Props> = ({ contracts }) => {
  const [symbolA, setSymbolA] = useState("GOLDM");
  const [symbolB, setSymbolB] = useState("GOLDTEN");
  const [rollingWindow, setRollingWindow] = useState(20);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [termStructureDate, setTermStructureDate] = useState<string>("");
  const [termStructure, setTermStructure] = useState<TermStructureData | null>(null);
  const [selectedCurveSymbol, setSelectedCurveSymbol] = useState("GOLDM");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolA, symbolB, rollingWindow]);

  useEffect(() => {
    loadTermStructure(termStructureDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termStructureDate]);

  async function loadData() {
    setLoading(true);
    try {
      const compData = await fetchComparison({
        symbol_a: symbolA,
        symbol_b: symbolB,
        window: rollingWindow,
      });
      setComparison(compData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadTermStructure(date?: string) {
    try {
      const tsData = await fetchTermStructure(date);
      setTermStructure(tsData);
      if (!termStructureDate && tsData.trade_date) {
        setTermStructureDate(tsData.trade_date);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const series = comparison?.series || [];
  const labels = series.map((s) => s.trade_date);

  const zScoreChartData = {
    labels,
    datasets: [
      {
        label: "Z-Score",
        data: series.map((s) => s.z_score),
        borderColor: "#B45309",
        backgroundColor: "rgba(180, 83, 9, 0.10)",
        borderWidth: 1.5,
        pointRadius: 0,
      },
      {
        label: "+2σ threshold",
        data: series.map(() => 2.0),
        borderColor: "#DC2626",
        borderDash: [5, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "−2σ threshold",
        data: series.map(() => -2.0),
        borderColor: "#0369A1",
        borderDash: [5, 4],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "Mean (0σ)",
        data: series.map(() => 0.0),
        borderColor: "#A8A29E",
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const volBandsChartData = {
    labels,
    datasets: [
      {
        label: "Absolute Spread",
        data: series.map((s) => s.absolute_spread),
        borderColor: "#1C1917",
        borderWidth: 1.5,
        pointRadius: 0,
      },
      {
        label: "+2σ upper",
        data: series.map((s) =>
          s.rolling_mean !== null && s.rolling_std !== null
            ? s.rolling_mean + 2 * s.rolling_std
            : null
        ),
        borderColor: "rgba(220, 38, 38, 0.45)",
        borderDash: [3, 3],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "−2σ lower",
        data: series.map((s) =>
          s.rolling_mean !== null && s.rolling_std !== null
            ? s.rolling_mean - 2 * s.rolling_std
            : null
        ),
        borderColor: "rgba(3, 105, 161, 0.45)",
        borderDash: [3, 3],
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "Rolling mean",
        data: series.map((s) => s.rolling_mean),
        borderColor: "#B45309",
        borderWidth: 1.2,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const curveForSymbol = termStructure?.curve_by_symbol[selectedCurveSymbol] || [];
  const curveLabels = curveForSymbol.map(
    (c) => `${c.expiry_date} (${c.days_to_expiry}d)`
  );

  const termCurveChartData = {
    labels: curveLabels,
    datasets: [
      {
        label: `${selectedCurveSymbol} Curve (₹/10g)`,
        data: curveForSymbol.map((c) => c.normalized_price_10g),
        borderColor: "#B45309",
        backgroundColor: "rgba(180, 83, 9, 0.08)",
        borderWidth: 2,
        pointRadius: 5,
        pointBackgroundColor: "#FFFFFF",
        pointBorderColor: "#B45309",
        pointBorderWidth: 2,
        tension: 0.1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-stone-900 tracking-tight leading-tight">
          Term Structure & Carry
        </h1>
        <p className="text-[13px] text-stone-500 mt-2 max-w-2xl leading-relaxed">
          Futures curves naturally exhibit contango or backwardation. This module isolates mechanical
          roll convergence from genuine relative-value divergence, with zero lookahead.
        </p>
      </div>

      {/* Z-score chart */}
      <div className="bg-white border border-stone-200/80 rounded-lg p-6 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-200/80">
          <div>
            <h2 className="font-display text-xl text-stone-900">
              Rolling Z-Score Oscillator
            </h2>
            <p className="text-[12px] text-stone-500 mt-0.5">
              Z = (Spread − μ) / σ · deviation in units of historical volatility
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <select
              value={rollingWindow}
              onChange={(e) => setRollingWindow(Number(e.target.value))}
              className="bg-stone-50 border border-stone-300 text-stone-800 font-mono text-[12px] rounded-md px-2.5 py-1.5"
            >
              <option value={15}>15d</option>
              <option value={20}>20d</option>
              <option value={30}>30d</option>
            </select>
          </div>
        </div>
        <div className="h-72 w-full">
          <Line data={zScoreChartData as any} options={defaultChartOptions as any} />
        </div>
      </div>

      {/* Vol bands chart */}
      <div className="bg-white border border-stone-200/80 rounded-lg p-6 card-shadow">
        <div className="pb-4 mb-4 border-b border-stone-200/80">
          <h2 className="font-display text-xl text-stone-900">
            Absolute Spread with ±2σ Bands
          </h2>
          <p className="text-[12px] text-stone-500 mt-0.5">
            Breaches of the dashed bands represent potential statistical anomalies (5% tail probability).
          </p>
        </div>
        <div className="h-72 w-full">
          <Line data={volBandsChartData as any} options={defaultChartOptions as any} />
        </div>
      </div>

      {/* Term structure */}
      <div className="bg-white border border-stone-200/80 rounded-lg p-6 card-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-200/80">
          <div>
            <h2 className="font-display text-xl text-stone-900">
              Futures Term Structure & Carry
            </h2>
            <p className="text-[12px] text-stone-500 mt-0.5">
              Curve structure (contango / backwardation) and annualized carry rate.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 px-3 py-1.5 rounded-md text-[12px] font-mono">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <input
                type="date"
                value={termStructureDate}
                onChange={(e) => setTermStructureDate(e.target.value)}
                className="bg-transparent text-stone-800 focus:outline-hidden"
              />
            </div>
            <select
              value={selectedCurveSymbol}
              onChange={(e) => setSelectedCurveSymbol(e.target.value)}
              className="bg-stone-50 border border-stone-300 text-stone-800 font-mono text-[12px] rounded-md px-3 py-1.5"
            >
              {contracts.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.symbol}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          <div className="h-64 w-full">
            {curveForSymbol.length > 0 ? (
              <Line data={termCurveChartData as any} options={defaultChartOptions as any} />
            ) : (
              <div className="h-full flex items-center justify-center text-stone-400 text-[12px] font-mono">
                No active contracts on {termStructureDate}.
              </div>
            )}
          </div>

          <div className="overflow-x-auto bg-stone-50/60 rounded-md border border-stone-200">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-stone-100 border-b border-stone-200">
                <tr className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Expiry</th>
                  <th className="py-2.5 px-3 text-right">Days</th>
                  <th className="py-2.5 px-3 text-right">Price</th>
                  <th className="py-2.5 px-3 text-right">Spread</th>
                  <th className="py-2.5 px-3 text-right text-amber-800">Carry</th>
                  <th className="py-2.5 px-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {curveForSymbol.map((item) => (
                  <tr key={item.expiry_date} className="hover:bg-white">
                    <td className="py-2.5 px-3 font-mono font-medium text-stone-900 tabular">{item.expiry_date}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-700 tabular">{item.days_to_expiry}d</td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-800 tabular">
                      ₹{item.normalized_price_10g.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-700 tabular">
                      {item.calendar_spread_vs_prev_expiry !== null
                        ? `${item.calendar_spread_vs_prev_expiry > 0 ? "+" : ""}₹${item.calendar_spread_vs_prev_expiry.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-800 tabular">
                      {item.annualized_carry_pct !== null ? `${item.annualized_carry_pct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          item.proximity_risk === "HIGH"
                            ? "bg-rose-50 text-rose-700"
                            : item.proximity_risk === "MEDIUM"
                            ? "bg-amber-50 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {item.proximity_risk === "HIGH"
                          ? "Tender"
                          : item.proximity_risk === "MEDIUM"
                          ? "Approaching"
                          : "Normal"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};