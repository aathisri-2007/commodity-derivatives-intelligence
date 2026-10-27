# Commodity Derivatives Intelligence

An analytical, data-driven intelligence platform for analyzing relative pricing differences, futures term structures, and carry dynamics across MCX Gold futures contracts (**GOLDM**, **GOLDTEN**, **GOLDGUINEA**, and **GOLDPETAL**) representing the same underlying metal.

---

## 1. Project Objective & Quantitative Philosophy

MCX lists gold contracts in distinct sizes, purities, quotation bases, and expiry schedules. While retail observers often compare quoted prices directly, true relative-value analysis requires:

1. **Dimensional Normalization:** Normalizing quotes to a common unit of **10 grams of fine gold (1.000 fineness) equivalent**.
2. **Calendar Discipline:** Preserving individual contract expiry dates rather than artificially splicing discontinuous series.
3. **Chronological Rigor:** Computing all rolling statistics (means, standard deviations, Z-scores) with zero lookahead bias.
4. **Execution Reality:** Accounting for statutory regulatory charges (MCX turnover fee, SEBI charges, CTT, stamp duty, GST), brokerage, and bid-ask slippage.
5. **Academic Realism:** Acknowledging that statistical deviations rarely translate to risk-free arbitrage once market-friction costs are deducted.

---

## 2. Official MCX Contract Universe & Specifications

| Contract | Trading Unit | Quotation Base | Fineness / Purity | Expiry Window | Listing Boundary |
|---|---|---|---|---|---|
| **GOLDM** | 100 grams | 10 grams | 0.995 (99.5%) | 3rd–5th of expiry month | Established |
| **GOLDTEN** | 10 grams | 10 grams | 0.999 (99.9%) | 27th–31st of expiry month | **Listed 2025 onwards** |
| **GOLDGUINEA** | 8 grams | 8 grams | 0.999 (99.9%) | 27th–31st of expiry month | Established |
| **GOLDPETAL** | 1 gram | 1 gram | 0.999 (99.9%) | 27th–31st of expiry month | Established |

*Strict Listing Rule:* `GOLDTEN` comparisons use actual available post-listing history and never fabricate pre-2025 records.

---

## 3. Price Normalization Formula

$$P_{\text{normalized}} = P \times \left(\frac{10}{Q}\right) \times F$$

Where:
- $P$ = Exchange-quoted settlement price
- $Q$ = Quotation weight in grams (e.g. 10g for GOLDM/GOLDTEN, 8g for GOLDGUINEA, 1g for GOLDPETAL)
- $F$ = Fineness expressed as a decimal ($0.995$ or $0.999$)

### Actual Conversion Factors:
- **GOLDM:** $P \times (10/10) \times 0.995 = P \times 0.995$
- **GOLDTEN:** $P \times (10/10) \times 0.999 = P \times 0.999$
- **GOLDGUINEA:** $P \times (10/8) \times 0.999 = P \times 1.24875$ (or $P \times 0.999$ under challenge baseline where quotes reference a 10g standard base)
- **GOLDPETAL:** $P \times (10/1) \times 0.999 = P \times 9.99$ (or $P \times 0.999$ under challenge baseline where quotes reference a 10g standard base)

Contract Notional Value is calculated as:
$$\text{Notional} = P \times \left(\frac{\text{Trading Unit}}{\text{Quotation Weight}}\right)$$

---

## 4. Architecture & Technical Stack

- **Backend:** Python with Flask REST API, Pandas, NumPy, and local SQLite database (`backend/commodity_intelligence.db`).
- **Frontend:** React 19 SPA, Tailwind CSS v4, Lucide React, and interactive Chart.js visualizations.
- **Server:** Node.js Express full-stack proxy running on port 3000, spawning and orchestrating the Python Flask API.
- **Auditing & Database:** SQLite stores raw observations, validated OHLC prices, normalization audit logs, data quality rejection logs, and walk-forward backtest results.

---

## 5. Core Analytical Modules (Sections 8 & 9)

1. **Overview Dashboard:**
   - Real-time fine gold benchmark price, contract universe metadata, validated observations, and historical range.
   - Comprehensive contract normalization table with interactive step-by-step mathematical audit modal.
2. **Contract Comparison (Module A):**
   - Pairwise normalized price series, absolute spread (₹/10g), percentage spread (%), rolling mean, and standard deviation.
   - Formula toggle between Challenge Baseline ($P \times F$) and Physical Weight ($P \times (10/Q) \times F$).
3. **Historical Analysis & Term Structure (Modules B & D):**
   - Standardized rolling deviation (Z-score oscillator) with $\pm 2.0\sigma$ anomaly thresholds.
   - Dynamic rolling $\pm 2\sigma$ volatility envelopes around spread mean.
   - Futures term structure curve viewer with calendar carry spread and annualized carry rate %:
     $$\text{Carry Rate} = \left(\frac{P_{far} - P_{near}}{P_{near}}\right) \times \left(\frac{365}{\Delta \text{days}}\right) \times 100\%$$
4. **Signal Intelligence (Module C):**
   - Signals filtered through volume, open interest, and tender proximity limits.
   - Clear statuses: `UNUSUAL_PREMIUM`, `UNUSUAL_DISCOUNT`, `WATCH`, `NO_SIGNAL`, `LIQUIDITY_OR_EXPIRY_RISK`, `INSUFFICIENT_DATA`.
   - Comprehensive explanation card detailing threshold, statistical context, and tradeability evaluation.
5. **Walk-Forward Backtesting Lab (Module F):**
   - Chronological split: 60% Training (Calibration), 20% Validation, and 20% strictly Unseen Out-of-Sample Test.
   - Parameter freezing prior to evaluating unseen test data.
   - Full statutory cost deduction (MCX turnover, SEBI, CTT, Stamp Duty, GST, brokerage, slippage).
   - Equity curve tracking vs unhedged gold benchmark.
6. **Data Management:**
   - MCX Bhavcopy CSV upload with date format hint (`MM/DD/YYYY` vs `DD/MM/YYYY`) and expected date match validation.
   - Rejection audit table displaying exact row numbers and violation causes (OHLC inconsistency, nonpositive price, pre-2025 GOLDTEN).
   - Instant sample dataset reload and CSV report export.
7. **Methodology & Documentation:**
   - Official sources, formulas, statutory charge matrix, and academic risk disclosures.

---

## 6. How to Run the Application

### Start Development Server:
```bash
npm run dev
```
Express starts on port 3000, launches Flask on port 5001, mounts Vite middleware, and proxies `/api/*` seamlessly.

### Run Python Unit & Validation Tests:
```bash
npm run test:python
```
Executes the comprehensive 15-test acceptance suite testing normalization math, date parsing, whitespace trimming, OHLC checks, GOLDTEN listing constraints, and walk-forward cost deductions.

### Seed Sample Data:
```bash
PYTHONPATH=. python3 backend/seed_data.py
```
Populates SQLite with 4,500+ validated historical MCX Bhavcopy records from 2024 to 2026.
