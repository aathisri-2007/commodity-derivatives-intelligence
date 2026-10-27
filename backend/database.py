"""
Local SQLite persistence module for Commodity Derivatives Intelligence.
Provides full auditable schema for raw observations, validated records, normalized prices,
data quality rejection logs, signal history, and walk-forward backtest results.
"""
import sqlite3
import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.contract_specs import CONTRACT_SPECS

DB_PATH = os.path.join(os.path.dirname(__file__), "commodity_intelligence.db")

def get_db_connection(db_path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db(db_path: str = DB_PATH) -> None:
    conn = get_db_connection(db_path)
    cursor = conn.cursor()

    # 1. Contract specifications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contract_specifications (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trading_unit_grams REAL NOT NULL,
        quotation_weight_grams REAL NOT NULL,
        purity_fineness REAL NOT NULL,
        expiry_rule TEXT NOT NULL,
        listing_effective_date TEXT NOT NULL,
        conversion_factor REAL NOT NULL,
        notes TEXT
    );
    """)

    # Seed contract specs
    for sym, spec in CONTRACT_SPECS.items():
        cursor.execute("""
        INSERT OR REPLACE INTO contract_specifications 
        (symbol, name, trading_unit_grams, quotation_weight_grams, purity_fineness, expiry_rule, listing_effective_date, conversion_factor, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            sym,
            spec["name"],
            spec["trading_unit_grams"],
            spec["quotation_weight_grams"],
            spec["purity_fineness"],
            spec["expiry_rule"],
            spec["listing_effective_date"],
            spec["standard_conversion_factor"],
            spec["notes"]
        ))

    # 2. Ingestion runs log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ingestion_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT NOT NULL,
        file_hash TEXT,
        total_rows INTEGER DEFAULT 0,
        accepted_rows INTEGER DEFAULT 0,
        rejected_rows INTEGER DEFAULT 0,
        duplicate_rows INTEGER DEFAULT 0,
        date_coverage_start TEXT,
        date_coverage_end TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 3. Raw imported observations (unmodified source values for complete auditability)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS raw_observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ingestion_run_id INTEGER,
        source_file TEXT NOT NULL,
        raw_symbol TEXT,
        raw_date TEXT,
        raw_expiry TEXT,
        raw_open TEXT,
        raw_high TEXT,
        raw_low TEXT,
        raw_close TEXT,
        raw_volume TEXT,
        raw_open_interest TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id) ON DELETE SET NULL
    );
    """)

    # 4. Ingestion rejections log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ingestion_rejections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ingestion_run_id INTEGER,
        source_file TEXT NOT NULL,
        row_number INTEGER,
        raw_symbol TEXT,
        raw_date TEXT,
        raw_expiry TEXT,
        rejection_reason TEXT NOT NULL,
        raw_line_content TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id) ON DELETE CASCADE
    );
    """)

    # 5. Validated contract prices
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS validated_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ingestion_run_id INTEGER,
        symbol TEXT NOT NULL,
        trade_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        open_price REAL NOT NULL,
        high_price REAL NOT NULL,
        low_price REAL NOT NULL,
        close_price REAL NOT NULL,
        volume INTEGER NOT NULL,
        open_interest INTEGER NOT NULL,
        days_to_expiry INTEGER NOT NULL,
        is_settlement_price INTEGER DEFAULT 1,
        source_file TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(symbol, trade_date, expiry_date),
        FOREIGN KEY (ingestion_run_id) REFERENCES ingestion_runs(id) ON DELETE SET NULL,
        FOREIGN KEY (symbol) REFERENCES contract_specifications(symbol)
    );
    """)

    # 6. Normalized prices table (stores calculations per 10g fine gold)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS normalized_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        price_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        trade_date TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        quoted_price REAL NOT NULL,
        normalized_close_challenge REAL NOT NULL,
        normalized_close_weight REAL NOT NULL,
        contract_notional_value REAL NOT NULL,
        conversion_factor REAL NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(symbol, trade_date, expiry_date),
        FOREIGN KEY (price_id) REFERENCES validated_prices(id) ON DELETE CASCADE
    );
    """)

    # 7. Signals history
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS signals_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signal_date TEXT NOT NULL,
        contract_a TEXT NOT NULL,
        contract_b TEXT NOT NULL,
        expiry_a TEXT NOT NULL,
        expiry_b TEXT NOT NULL,
        norm_price_a REAL NOT NULL,
        norm_price_b REAL NOT NULL,
        absolute_spread REAL NOT NULL,
        percentage_spread REAL NOT NULL,
        rolling_mean_spread REAL,
        rolling_std_spread REAL,
        z_score REAL,
        signal_status TEXT NOT NULL,
        reason TEXT NOT NULL,
        confidence REAL,
        liquidity_flag INTEGER DEFAULT 0,
        expiry_warning INTEGER DEFAULT 0,
        observation_count INTEGER NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # 8. Backtest results
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS backtest_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_name TEXT NOT NULL,
        pair_key TEXT NOT NULL,
        train_start TEXT NOT NULL,
        train_end TEXT NOT NULL,
        test_start TEXT NOT NULL,
        test_end TEXT NOT NULL,
        z_entry_threshold REAL NOT NULL,
        z_exit_threshold REAL NOT NULL,
        slippage_basis_points REAL NOT NULL,
        brokerage_per_lot REAL NOT NULL,
        initial_capital REAL NOT NULL,
        metrics_json TEXT NOT NULL,
        trades_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # Create helpful indexes for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_val_prices_sym_date ON validated_prices(symbol, trade_date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_val_prices_date ON validated_prices(trade_date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_norm_prices_sym_date ON normalized_prices(symbol, trade_date);")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
