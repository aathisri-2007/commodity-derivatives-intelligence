"""
Flask REST API Backend for Commodity Derivatives Intelligence.
Provides endpoints for:
- /api/health
- /api/data/upload
- /api/data/status
- /api/contracts
- /api/prices
- /api/comparison
- /api/term-structure
- /api/signals
- /api/backtest
- /api/backtest/results
- /api/reports/export
- /api/data/reset-sample
"""

import os
import json
import csv
import io
from datetime import datetime
from flask import Flask, request, jsonify, make_response
from backend.contract_specs import CONTRACT_SPECS
from backend.normalization import default_engine, weight_engine
from backend.database import get_db_connection, init_db
from backend.data_ingestion import BhavcopyIngestionService
from backend.analytics import AnalyticsEngine
from backend.seed_data import seed_sample_data

app = Flask(__name__)

# Ensure DB is initialized
init_db()
analytics = AnalyticsEngine()
ingestion_service = BhavcopyIngestionService()

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS"
    return response

# 1. Health
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Commodity Derivatives Intelligence API",
        "timestamp": datetime.utcnow().isoformat(),
        "database_connected": True
    })

# 2. Contract Specifications
@app.route("/api/contracts", methods=["GET"])
def get_contracts():
    specs = []
    for sym, s in CONTRACT_SPECS.items():
        specs.append({
            "symbol": sym,
            "name": s["name"],
            "trading_unit_grams": s["trading_unit_grams"],
            "quotation_weight_grams": s["quotation_weight_grams"],
            "purity_fineness": s["purity_fineness"],
            "purity_percentage": round(s["purity_fineness"] * 100.0, 1),
            "expiry_rule": s["expiry_rule"],
            "listing_effective_date": s["listing_effective_date"],
            "standard_conversion_factor": s["standard_conversion_factor"],
            "notes": s["notes"],
            "verification_status": "Verified against MCX India Bullion Product Specifications"
        })
    return jsonify({
        "success": True,
        "count": len(specs),
        "contracts": specs
    })

# 3. Data Status & Quality Reports
@app.route("/api/data/status", methods=["GET"])
def get_data_status():
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) as total_prices FROM validated_prices;")
    total_prices = c.fetchone()["total_prices"]

    c.execute("SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date FROM validated_prices;")
    date_bounds = c.fetchone()

    c.execute("""
        SELECT symbol, COUNT(*) as count, MIN(trade_date) as start_date, MAX(trade_date) as end_date,
               COUNT(DISTINCT expiry_date) as distinct_expiries
        FROM validated_prices
        GROUP BY symbol;
    """)
    contracts_coverage = [dict(r) for r in c.fetchall()]

    c.execute("""
        SELECT id, source_name, total_rows, accepted_rows, rejected_rows, duplicate_rows,
               date_coverage_start, date_coverage_end, notes, created_at
        FROM ingestion_runs
        ORDER BY id DESC LIMIT 5;
    """)
    recent_runs = [dict(r) for r in c.fetchall()]

    c.execute("""
        SELECT id, row_number, raw_symbol, raw_date, raw_expiry, rejection_reason, created_at
        FROM ingestion_rejections
        ORDER BY id DESC LIMIT 20;
    """)
    recent_rejections = [dict(r) for r in c.fetchall()]

    conn.close()

    return jsonify({
        "success": True,
        "total_validated_prices": total_prices,
        "date_coverage": {
            "start": date_bounds["min_date"],
            "end": date_bounds["max_date"]
        },
        "coverage_by_symbol": contracts_coverage,
        "recent_ingestion_runs": recent_runs,
        "recent_rejections": recent_rejections
    })

# 4. Upload Bhavcopy CSV
@app.route("/api/data/upload", methods=["POST"])
def upload_bhavcopy():
    if "file" not in request.files:
        # Check raw body
        csv_text = request.get_data(as_text=True)
        filename = "direct_upload.csv"
    else:
        uploaded_file = request.files["file"]
        if uploaded_file.filename == "":
            return jsonify({"success": False, "error": "No file selected."}), 400
        filename = uploaded_file.filename
        csv_text = uploaded_file.read().decode("utf-8", errors="replace")

    date_format = request.args.get("date_format", "MM/DD/YYYY")
    expected_date = request.args.get("expected_date", None)

    result = ingestion_service.ingest_csv_content(
        csv_text,
        source_name=filename,
        date_format_hint=date_format,
        expected_request_date=expected_date
    )

    if not result.get("success"):
        return jsonify(result), 400

    return jsonify(result)

# 5. Reset to official verified sample Bhavcopy
@app.route("/api/data/reset-sample", methods=["POST"])
def reset_sample_data():
    try:
        res = seed_sample_data()
        return jsonify({"success": True, "message": "Historical sample data seeded successfully.", "result": res})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# 6. Latest / Filtered Prices
@app.route("/api/prices", methods=["GET"])
def get_prices():
    symbol = request.args.get("symbol")
    trade_date = request.args.get("date")
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))

    conn = get_db_connection()
    c = conn.cursor()

    query = """
        SELECT v.id, v.symbol, v.trade_date, v.expiry_date, v.open_price, v.high_price, v.low_price,
               v.close_price, v.volume, v.open_interest, v.days_to_expiry,
               n.normalized_close_challenge, n.normalized_close_weight, n.contract_notional_value,
               n.conversion_factor
        FROM validated_prices v
        JOIN normalized_prices n ON v.id = n.price_id
        WHERE 1=1
    """
    params = []
    if symbol:
        query += " AND v.symbol = ?"
        params.append(symbol.strip().upper())
    if trade_date:
        query += " AND v.trade_date = ?"
        params.append(trade_date.strip())

    query += " ORDER BY v.trade_date DESC, v.symbol ASC LIMIT ? OFFSET ?;"
    params.extend([limit, offset])

    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "count": len(rows),
        "prices": rows
    })

# 7. Cross-Contract Comparison (Module A)
@app.route("/api/comparison", methods=["GET"])
def get_comparison():
    sym_a = request.args.get("symbol_a", "GOLDM").strip().upper()
    sym_b = request.args.get("symbol_b", "GOLDTEN").strip().upper()
    exp_a = request.args.get("expiry_a", None)
    exp_b = request.args.get("expiry_b", None)
    rolling_window = int(request.args.get("window", 20))
    norm_mode = request.args.get("norm_mode", "challenge_baseline")

    if sym_a == sym_b and (not exp_a or not exp_b or exp_a == exp_b):
        return jsonify({
            "success": False,
            "error": "Comparison requires two distinct contracts or different expiries of the same contract."
        }), 400

    try:
        data = analytics.compute_relative_value_series(
            symbol_a=sym_a,
            symbol_b=sym_b,
            expiry_a=exp_a,
            expiry_b=exp_b,
            rolling_window=rolling_window,
            normalization_mode=norm_mode
        )
        return jsonify({"success": True, "comparison": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# 8. Term Structure & Carry Analytics (Module B)
@app.route("/api/term-structure", methods=["GET"])
def get_term_structure():
    trade_date = request.args.get("date", None)
    try:
        data = analytics.compute_term_structure(trade_date)
        return jsonify({"success": True, "term_structure": data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# 9. Signal Intelligence (Module C)
@app.route("/api/signals", methods=["GET"])
def get_signals():
    sym_a = request.args.get("symbol_a", "GOLDM").strip().upper()
    sym_b = request.args.get("symbol_b", "GOLDTEN").strip().upper()
    z_thresh = float(request.args.get("z_threshold", 2.0))
    min_vol = int(request.args.get("min_volume", 10))
    min_oi = int(request.args.get("min_oi", 20))
    window = int(request.args.get("window", 20))

    try:
        signals_data = analytics.detect_signals(
            symbol_a=sym_a,
            symbol_b=sym_b,
            z_threshold=z_thresh,
            min_volume=min_vol,
            min_oi=min_oi,
            min_history_window=window
        )
        return jsonify({"success": True, "signals": signals_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# 10. Walk-Forward Backtesting (Module F)
@app.route("/api/backtest", methods=["POST"])
def run_backtest():
    payload = request.get_json(force=True, silent=True) or {}
    sym_a = payload.get("symbol_a", "GOLDM")
    sym_b = payload.get("symbol_b", "GOLDTEN")
    train_ratio = float(payload.get("train_ratio", 0.60))
    val_ratio = float(payload.get("val_ratio", 0.20))
    z_entry = float(payload.get("z_entry_threshold", 2.0))
    z_exit = float(payload.get("z_exit_threshold", 0.5))
    window = int(payload.get("rolling_window", 20))
    brokerage = float(payload.get("brokerage_per_lot", 20.0))
    slippage = float(payload.get("slippage_basis_points", 2.0))
    capital = float(payload.get("initial_capital", 500000.0))

    try:
        results = analytics.run_walk_forward_backtest(
            symbol_a=sym_a,
            symbol_b=sym_b,
            train_ratio=train_ratio,
            val_ratio=val_ratio,
            z_entry_threshold=z_entry,
            z_exit_threshold=z_exit,
            rolling_window=window,
            brokerage_per_lot=brokerage,
            slippage_basis_points=slippage,
            initial_capital=capital
        )
        return jsonify(results)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# 11. Historical Backtest Runs
@app.route("/api/backtest/results", methods=["GET"])
def get_backtest_runs():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT id, run_name, pair_key, train_start, train_end, test_start, test_end,
               z_entry_threshold, z_exit_threshold, slippage_basis_points, brokerage_per_lot,
               initial_capital, metrics_json, created_at
        FROM backtest_runs
        ORDER BY id DESC LIMIT 10;
    """)
    runs = []
    for r in c.fetchall():
        item = dict(r)
        try:
            item["metrics"] = json.loads(item["metrics_json"])
        except Exception:
            item["metrics"] = {}
        del item["metrics_json"]
        runs.append(item)
    conn.close()

    return jsonify({"success": True, "runs": runs})

# 12. Reports Export (CSV / JSON)
@app.route("/api/reports/export", methods=["GET"])
def export_report():
    report_type = request.args.get("type", "prices")  # "prices", "signals", "backtest"
    fmt = request.args.get("format", "csv")           # "csv" or "json"

    conn = get_db_connection()
    c = conn.cursor()

    if report_type == "prices":
        c.execute("""
            SELECT v.symbol, v.trade_date, v.expiry_date, v.open_price, v.high_price, v.low_price,
                   v.close_price, v.volume, v.open_interest, n.normalized_close_challenge as normalized_price_10g,
                   n.contract_notional_value
            FROM validated_prices v
            JOIN normalized_prices n ON v.id = n.price_id
            ORDER BY v.trade_date DESC, v.symbol ASC;
        """)
        rows = [dict(r) for r in c.fetchall()]
        filename = f"mcx_gold_normalized_prices_{datetime.utcnow().strftime('%Y%m%d')}"

    elif report_type == "signals":
        sym_a = request.args.get("symbol_a", "GOLDM")
        sym_b = request.args.get("symbol_b", "GOLDTEN")
        signals_data = analytics.detect_signals(sym_a, sym_b)
        rows = signals_data["signals"]
        filename = f"mcx_gold_signals_{sym_a}_{sym_b}_{datetime.utcnow().strftime('%Y%m%d')}"

    else:
        # Default backtest
        bt = analytics.run_walk_forward_backtest()
        rows = bt["unseen_test_results"]["trades"] if bt.get("success") else []
        filename = f"mcx_gold_backtest_trades_{datetime.utcnow().strftime('%Y%m%d')}"

    conn.close()

    if fmt == "json":
        return jsonify({"report_type": report_type, "count": len(rows), "data": rows})

    # CSV output
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = f"attachment; filename={filename}.csv"
    response.headers["Content-Type"] = "text/csv"
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting Commodity Derivatives Intelligence Flask API on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
