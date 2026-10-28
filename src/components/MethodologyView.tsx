import React from "react";
import { BookOpen, ExternalLink, AlertTriangle } from "lucide-react";
import { ContractSpec } from "../types";

interface Props {
  contracts: ContractSpec[];
}

export const MethodologyView: React.FC<Props> = ({ contracts }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="font-display text-4xl text-stone-900 tracking-tight leading-tight">
          Methodology & Specifications
        </h1>
        <p className="text-[13px] text-stone-500 mt-2 max-w-2xl leading-relaxed">
          Defensible analytical architecture for multi-contract MCX gold futures relative-value
          intelligence. All formulas, sources, and cost matrices are documented below.
        </p>
      </div>

      {/* 1. Data Sources */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-stone-900 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-700"></span>
          1. Official Data Sources
        </h2>
        <p className="text-[13px] text-stone-600 leading-relaxed">
          The primary dataset is the official Multi Commodity Exchange of India (MCX) Daily Bhavcopy.
          No third-party mock feeds or fabricated prices are used.
        </p>
        <div className="bg-white border border-stone-200/80 rounded-lg p-4 card-shadow space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="text-stone-700 font-medium">MCX Daily Bhavcopy Repository</span>
            <a
              href="https://www.mcxindia.com/market-data/bhavcopy"
              target="_blank"
              rel="noreferrer"
              className="text-amber-700 hover:text-amber-900 flex items-center gap-1 font-mono"
            >
              mcxindia.com/market-data/bhavcopy <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center justify-between border-t border-stone-100 pt-2">
            <span className="text-stone-700 font-medium">MCX Bullion Contract Specs</span>
            <a
              href="https://www.mcxindia.com/products/bullion/gold"
              target="_blank"
              rel="noreferrer"
              className="text-amber-700 hover:text-amber-900 flex items-center gap-1 font-mono"
            >
              mcxindia.com/products/bullion/gold <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {/* 2. Contract Specifications Matrix */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-stone-900 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-700"></span>
          2. Contract Specifications Matrix
        </h2>
        <div className="bg-white border border-stone-200/80 rounded-lg overflow-hidden card-shadow">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-stone-50/60 border-b border-stone-200/80">
              <tr className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4 text-right">Trading Unit</th>
                <th className="py-3 px-4 text-right">Quote Base</th>
                <th className="py-3 px-4 text-right">Purity</th>
                <th className="py-3 px-4">Expiry Window</th>
                <th className="py-3 px-4">Listing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {contracts.map((c) => (
                <tr key={c.symbol} className="hover:bg-stone-50/60">
                  <td className="py-3 px-4 font-mono font-semibold text-stone-900">{c.symbol}</td>
                  <td className="py-3 px-4 text-right font-mono text-stone-700 tabular">
                    {c.trading_unit_grams}g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-stone-700 tabular">
                    {c.quotation_weight_grams}g
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-stone-700 tabular">
                    {c.purity_fineness}
                  </td>
                  <td className="py-3 px-4 text-stone-600">{c.expiry_rule}</td>
                  <td className="py-3 px-4">
                    {c.symbol === "GOLDTEN" ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                        2025+
                      </span>
                    ) : (
                      <span className="text-stone-500 text-[11px]">Established</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-stone-500 italic leading-relaxed">
          GOLDTEN was listed in 2025. Historical comparisons strictly respect this listing boundary;
          pre-listing prices are never fabricated.
        </p>
      </section>

      {/* 3. Normalization Engine */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-stone-900 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-700"></span>
          3. Normalization Engine
        </h2>
        <p className="text-[13px] text-stone-600 leading-relaxed">
          Comparing raw quoted prices directly produces severe dimensional distortions. Every contract
          price is converted to a standardized unit of <strong className="text-stone-900">10 grams of fine gold
          (1.000 fineness) equivalent</strong>.
        </p>

        <div className="bg-white border border-stone-200/80 rounded-lg p-5 card-shadow space-y-4">
          <div>
            <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Documented Formula
            </div>
            <div className="bg-amber-50 border border-amber-200/60 rounded-md p-3 font-mono text-[13px] text-amber-900 font-semibold">
              P_normalized = P × (10 / Q) × F
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
            <div className="bg-stone-50 border border-stone-200 rounded-md p-3">
              <div className="text-stone-500 text-[10px] uppercase tracking-wider font-semibold">P</div>
              <div className="text-stone-700 mt-0.5">Exchange-quoted price</div>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-md p-3">
              <div className="text-stone-500 text-[10px] uppercase tracking-wider font-semibold">Q</div>
              <div className="text-stone-700 mt-0.5">Quotation weight (g)</div>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-md p-3">
              <div className="text-stone-500 text-[10px] uppercase tracking-wider font-semibold">F</div>
              <div className="text-stone-700 mt-0.5">Fineness (0.995 or 0.999)</div>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-1.5 text-[12px] font-mono">
            <div className="flex justify-between">
              <span className="text-stone-600">GOLDM</span>
              <span className="text-stone-900">P × (10/10) × 0.995 = <strong>P × 0.995</strong></span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">GOLDTEN</span>
              <span className="text-stone-900">P × (10/10) × 0.999 = <strong>P × 0.999</strong></span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">GOLDGUINEA</span>
              <span className="text-stone-900">P × (10/8) × 0.999 = <strong>P × 1.24875</strong></span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">GOLDPETAL</span>
              <span className="text-stone-900">P × (10/1) × 0.999 = <strong>P × 9.99</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Cost Model */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-stone-900 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-700"></span>
          4. Transaction Cost Model
        </h2>
        <p className="text-[13px] text-stone-600 leading-relaxed">
          In commodity derivatives arbitrage, transaction friction is asymmetric and non-negligible.
          The engine models statutory exchange and regulatory fees alongside execution slippage:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: "MCX Turnover Fee", value: "0.0021% (₹210 / crore)", verified: true },
            { label: "SEBI Regulatory Fee", value: "0.0001% (₹10 / crore)", verified: true },
            { label: "Commodity Transaction Tax (CTT)", value: "0.01% on sell-side", verified: true },
            { label: "Stamp Duty", value: "0.002% on buy-side", verified: true },
            { label: "GST", value: "18% on brokerage & exchange charges", verified: true },
            { label: "Execution Slippage", value: "2.0 – 5.0 bps (configured)", verified: false },
          ].map((fee, i) => (
            <div key={i} className="bg-white border border-stone-200/80 rounded-lg p-3.5 card-shadow">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-medium">{fee.label}</span>
                {fee.verified ? (
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                    Verified
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">
                    Estimated
                  </span>
                )}
              </div>
              <div className="text-[13px] font-mono font-semibold text-stone-900 mt-1.5 tabular">
                {fee.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Walk-Forward Protocol */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-stone-900 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-700"></span>
          5. Walk-Forward Protocol
        </h2>
        <p className="text-[13px] text-stone-600 leading-relaxed">
          To prevent look-ahead bias and overfitting, the evaluation protocol enforces:
        </p>
        <ul className="space-y-2 text-[13px] text-stone-700">
          <li className="flex gap-2">
            <span className="text-amber-700 font-bold shrink-0">•</span>
            <span>
              <strong className="text-stone-900">Chronological Partitioning:</strong> Records are strictly
              sorted by date. Training, Validation, and Test sets never overlap.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-700 font-bold shrink-0">•</span>
            <span>
              <strong className="text-stone-900">Parameter Freezing:</strong> Thresholds calibrated in-sample
              are permanently frozen before evaluating the unseen test period.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-700 font-bold shrink-0">•</span>
            <span>
              <strong className="text-stone-900">Contract Lot Balancing:</strong> Positions balance underlying
              metal notional (e.g. 1 lot GOLDM = 100g, 10 lots GOLDTEN = 100g).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-700 font-bold shrink-0">•</span>
            <span>
              <strong className="text-stone-900">Gold Benchmark Isolation:</strong> Unhedged gold buy-and-hold
              returns are tracked concurrently to ensure market-neutral spread alpha is not conflated with
              general bullion rallies.
            </span>
          </li>
        </ul>
      </section>

      {/* 6. Limitations */}
      <section className="bg-amber-50 border border-amber-200/80 rounded-lg p-5 space-y-2 card-shadow">
        <h3 className="font-display text-lg text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Academic Rigor & Limitations
        </h3>
        <p className="text-[12px] text-stone-700 leading-relaxed">
          Official daily Bhavcopy close prices represent exchange settlement marks. While they serve as the
          official benchmark for daily margining, they do not guarantee executable limit-order book depth at
          the exact mark, particularly in micro or retail contracts such as GOLDPETAL. Our research finding
          explicitly highlights that apparent statistical anomalies rarely survive institutional round-trip
          costs and bid-ask slippage.
        </p>
      </section>
    </div>
  );
};

export default MethodologyView;