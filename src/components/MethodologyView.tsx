import React from "react";
import { BookOpen, ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle, Layers } from "lucide-react";
import { ContractSpec } from "../types";

interface Props {
  contracts: ContractSpec[];
}

export const MethodologyView: React.FC<Props> = ({ contracts }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 text-slate-300">
      {/* Title */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          Quantitative Methodology, Specifications & Regulatory Auditing
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Defensible analytical architecture for multi-contract MCX gold futures relative-value intelligence.
        </p>
      </div>

      {/* 1. Official Data Sources */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          1. Official Data Sources & Bhavcopy Ingestion
        </h3>
        <p className="text-xs leading-relaxed text-slate-400">
          The primary dataset is the official Multi Commodity Exchange of India (MCX) Daily Bhavcopy.
          No third-party mock feeds or fabricated prices are used.
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-200 font-mono">
            <span>MCX Daily Bhavcopy Repository</span>
            <a
              href="https://www.mcxindia.com/market-data/bhavcopy"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              mcxindia.com/market-data/bhavcopy <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center justify-between text-slate-200 font-mono">
            <span>MCX Bullion Contract Specifications</span>
            <a
              href="https://www.mcxindia.com/products/bullion/gold"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              mcxindia.com/products/bullion/gold <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {/* 2. Contract Specifications Matrix */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          2. Official MCX Gold Contract Specifications Matrix
        </h3>
        <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Trading Unit</th>
                <th className="py-3 px-4">Quotation Base</th>
                <th className="py-3 px-4">Purity</th>
                <th className="py-3 px-4">Expiry Window</th>
                <th className="py-3 px-4">Listing Effective</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {contracts.map((c) => (
                <tr key={c.symbol}>
                  <td className="py-3 px-4 font-bold text-slate-100">{c.symbol}</td>
                  <td className="py-3 px-4">{c.trading_unit_grams}g</td>
                  <td className="py-3 px-4">{c.quotation_weight_grams}g</td>
                  <td className="py-3 px-4">{c.purity_fineness} ({c.purity_percentage}%)</td>
                  <td className="py-3 px-4 font-sans text-slate-400">{c.expiry_rule}</td>
                  <td className="py-3 px-4">
                    {c.symbol === "GOLDTEN" ? (
                      <span className="text-amber-300 font-bold">2025 Listing Period</span>
                    ) : (
                      "Pre-existing"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 italic">
          *Important Constraint: GOLDTEN was listed in 2025. Historical comparisons strictly respect this listing boundary; pre-listing prices are never fabricated.
        </p>
      </section>

      {/* 3. Price Normalization Engine */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          3. Price Normalization Engine
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Comparing raw quoted prices directly produces severe dimensional distortions.
          Every contract price is converted to a standardized unit of <strong>10 grams of fine gold (1.000 fineness) equivalent</strong>.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
          <div className="text-amber-400 font-bold">Documented Formula:</div>
          <div className="bg-slate-950 p-3 rounded border border-slate-800 text-sm text-slate-100">
            P_normalized = P × (10 / Q) × F
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 font-sans">
            <div><strong>P:</strong> Exchange-quoted price</div>
            <div><strong>Q:</strong> Quotation weight in grams</div>
            <div><strong>F:</strong> Fineness decimal (0.995 or 0.999)</div>
          </div>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans space-y-1">
            <div>• <strong>GOLDM:</strong> P × (10 / 10) × 0.995 = <strong>P × 0.995</strong></div>
            <div>• <strong>GOLDTEN:</strong> P × (10 / 10) × 0.999 = <strong>P × 0.999</strong></div>
            <div>• <strong>GOLDGUINEA:</strong> P × (10 / 8) × 0.999 = <strong>P × 1.24875</strong> (or P × 0.999 when standardized on 10g quotation basis)</div>
            <div>• <strong>GOLDPETAL:</strong> P × (10 / 1) × 0.999 = <strong>P × 9.99</strong> (or P × 0.999 when standardized on 10g quotation basis)</div>
          </div>
        </div>
      </section>

      {/* 4. Risk & Transaction-Cost Model */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          4. Regulatory Charges & Transaction-Cost Breakdown
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          In commodity derivatives arbitrage, transaction friction is asymmetric and non-negligible.
          The engine models statutory exchange and regulatory fees alongside execution slippage:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-slate-400 text-[11px]">MCX Turnover Fee (Verified)</div>
            <div className="font-bold text-slate-100">0.0021% (₹210 / crore)</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-slate-400 text-[11px]">SEBI Regulatory Fee (Verified)</div>
            <div className="font-bold text-slate-100">0.0001% (₹10 / crore)</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-slate-400 text-[11px]">Commodity Transaction Tax (CTT) (Verified)</div>
            <div className="font-bold text-slate-100">0.01% on sell-side turnover</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-slate-400 text-[11px]">Stamp Duty (Verified)</div>
            <div className="font-bold text-slate-100">0.002% on buy-side turnover</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-slate-400 text-[11px]">GST (Goods & Services Tax) (Verified)</div>
            <div className="font-bold text-slate-100">18% on Brokerage & Exchange charges</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <div className="text-slate-400 text-[11px]">Execution Slippage (Configured/Estimated)</div>
            <div className="font-bold text-amber-300">2.0 to 5.0 bps of trade notional</div>
          </div>
        </div>
      </section>

      {/* 5. Walk-Forward Backtesting Protocol */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          5. Walk-Forward Backtesting Protocol
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          To prevent the pervasive flaw of look-ahead bias and overfitting:
        </p>
        <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1.5 font-sans">
          <li><strong>Chronological Partitioning:</strong> Records are strictly sorted by date. Training, Validation, and Test sets never overlap.</li>
          <li><strong>Parameter Freezing:</strong> Thresholds and rolling parameters calibrated in-sample are permanently frozen before evaluating the unseen test period.</li>
          <li><strong>Contract Lot Balancing:</strong> Positions balance underlying metal notional (e.g. 1 lot GOLDM = 100g, 10 lots GOLDTEN = 100g).</li>
          <li><strong>Gold Benchmark Isolation:</strong> Unhedged gold buy-and-hold returns are tracked concurrently to ensure market-neutral spread alpha is not conflated with general bullion rallies.</li>
        </ul>
      </section>

      {/* 6. Known Uncertainties & Limitations */}
      <section className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-5 space-y-2">
        <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Academic Rigor & Limitations
        </h4>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Official daily Bhavcopy close prices represent exchange settlement marks. While they serve as the official benchmark
          for daily margining, they do not guarantee executable limit-order book depth at the exact mark, particularly in micro or retail contracts (e.g., GOLDPETAL).
          Our research finding explicitly highlights that apparent statistical anomalies rarely survive institutional round-trip costs and bid-ask slippage.
        </p>
      </section>
    </div>
  );
};
