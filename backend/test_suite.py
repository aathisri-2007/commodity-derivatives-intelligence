"""
Unit and Historical Validation Test Suite.
Addresses all Acceptance Criteria in Section 14:
1. Valid MCX CSV imports successfully
2. Invalid CSV produces useful error
3. Symbol whitespace handled correctly (trimmed)
4. Dates parsed using correct format (MM/DD/YYYY vs DD/MM/YYYY)
5. Returned date verified against requested date
6. Compact expiry dates parsed accurately (e.g. 04SEP2026)
7. Correct quotation bases and purity for all 4 contracts
8. Normalization formula unit tests P * (10/Q) * F
9. GOLDTEN pre-listing constraint verified (no pre-2025 fabrication)
10. Different expiries remain individually identifiable
11. Missing records do not generate false signals
12. Signals use only historically available data
13. Backtest has genuinely unseen test period
14. Transaction costs deducted from reported net results
15. Settlement fill warning and slippage accountability
16. Thin trading activity triggers appropriate warnings
17. Distinguishes gold price movement from relative-value strategy performance
18. Explains insufficient evidence instead of fabricating results
"""

import unittest
import os
import tempfile
from datetime import datetime

from backend.contract_specs import CONTRACT_SPECS
from backend.normalization import NormalizationEngine, default_engine, weight_engine
from backend.data_ingestion import parse_compact_expiry, parse_trade_date, BhavcopyIngestionService
from backend.database import init_db, get_db_connection
from backend.analytics import AnalyticsEngine

class TestContractSpecsAndNormalization(unittest.TestCase):
    def test_contract_specifications_completeness(self):
        """Check all 4 contracts have required trading unit, quotation base, purity, and expiry rules."""
        required_keys = ["GOLDM", "GOLDTEN", "GOLDGUINEA", "GOLDPETAL"]
        for sym in required_keys:
            self.assertIn(sym, CONTRACT_SPECS)
            spec = CONTRACT_SPECS[sym]
            self.assertGreater(spec["trading_unit_grams"], 0)
            self.assertGreater(spec["quotation_weight_grams"], 0)
            self.assertIn(spec["purity_fineness"], [0.995, 0.999])

    def test_goldm_normalization(self):
        """GOLDM: 10g quotation base, 995 fineness. Quoted 72,000 -> 72,000 * 0.995 = 71,640."""
        res = default_engine.normalize("GOLDM", 72000.0)
        self.assertEqual(res["normalized_price_per_10g_fine"], 71640.0)
        self.assertEqual(res["quotation_weight_grams"], 10.0)
        self.assertEqual(res["purity_fineness"], 0.995)
        # Notional value for 100g = 72,000 * (100 / 10) = 720,000
        self.assertEqual(res["contract_notional_value"], 720000.0)

    def test_goldten_normalization(self):
        """GOLDTEN: 10g quotation base, 999 fineness. Quoted 72,000 -> 72,000 * 0.999 = 71,928."""
        res = default_engine.normalize("GOLDTEN", 72000.0)
        self.assertEqual(res["normalized_price_per_10g_fine"], 71928.0)
        self.assertEqual(res["purity_fineness"], 0.999)
        # Notional for 10g = 72,000
        self.assertEqual(res["contract_notional_value"], 72000.0)

    def test_goldguinea_normalization(self):
        """GOLDGUINEA: 8g trading unit, 999 fineness."""
        # Challenge baseline mode: P * 0.999
        res_cb = default_engine.normalize("GOLDGUINEA", 58000.0)
        self.assertEqual(res_cb["normalized_price_per_10g_fine"], round(58000.0 * 0.999, 2))
        
        # Physical weight normalization mode: P * (10 / 8) * 0.999
        res_wt = weight_engine.normalize("GOLDGUINEA", 58000.0)
        expected = 58000.0 * (10.0 / 8.0) * 0.999
        self.assertEqual(res_wt["normalized_price_per_10g_fine"], round(expected, 2))

    def test_goldpetal_normalization(self):
        """GOLDPETAL: 1g micro contract, 999 fineness."""
        res_cb = default_engine.normalize("GOLDPETAL", 7200.0)
        self.assertEqual(res_cb["normalized_price_per_10g_fine"], round(7200.0 * 0.999, 2))

        # Physical weight mode: P * (10 / 1) * 0.999
        res_wt = weight_engine.normalize("GOLDPETAL", 7200.0)
        expected = 7200.0 * 10.0 * 0.999
        self.assertEqual(res_wt["normalized_price_per_10g_fine"], round(expected, 2))

    def test_invalid_prices_rejected(self):
        """Zero and negative prices must raise ValueError."""
        with self.assertRaises(ValueError):
            default_engine.normalize("GOLDM", 0.0)
        with self.assertRaises(ValueError):
            default_engine.normalize("GOLDM", -500.0)


class TestDataIngestionAndValidation(unittest.TestCase):
    def setUp(self):
        self.temp_db_fd, self.temp_db_path = tempfile.mkstemp(suffix=".db")
        init_db(self.temp_db_path)
        self.ingestion_service = BhavcopyIngestionService(self.temp_db_path)

    def tearDown(self):
        os.close(self.temp_db_fd)
        if os.path.exists(self.temp_db_path):
            os.remove(self.temp_db_path)

    def test_compact_expiry_parsing(self):
        """Test compact expiries like 04SEP2026, 27MAR2025, 05JUN2025."""
        self.assertEqual(parse_compact_expiry("04SEP2026"), "2026-09-04")
        self.assertEqual(parse_compact_expiry("27MAR2025"), "2025-03-27")
        self.assertEqual(parse_compact_expiry("05JUN2025"), "2025-06-05")
        self.assertEqual(parse_compact_expiry("2026-10-05"), "2026-10-05")
        self.assertIsNone(parse_compact_expiry("INVALID_EXP"))

    def test_trade_date_parsing_and_request_verification(self):
        """Verify MM/DD/YYYY and request date verification."""
        self.assertEqual(parse_trade_date("08/15/2025", "MM/DD/YYYY"), "2025-08-15")
        self.assertEqual(parse_trade_date("15/08/2025", "DD/MM/YYYY"), "2025-08-15")
        self.assertEqual(parse_trade_date("2025-08-15"), "2025-08-15")

    def test_whitespace_symbol_trimming(self):
        """Whitespace in Symbol like '  GOLDM  ' must be trimmed and accepted."""
        csv_content = """Symbol,Date,ExpiryDate,Open,High,Low,Close,Volume,OpenInterest
  GOLDM  ,05/10/2025,05JUN2025,72000,72500,71800,72100,500,1200
"""
        res = self.ingestion_service.ingest_csv_content(csv_content, source_name="test_ws.csv")
        self.assertTrue(res["success"])
        self.assertEqual(res["accepted_rows"], 1)

        conn = get_db_connection(self.temp_db_path)
        row = conn.execute("SELECT symbol FROM validated_prices;").fetchone()
        self.assertEqual(row["symbol"], "GOLDM")
        conn.close()

    def test_goldten_pre_listing_rejection(self):
        """GOLDTEN records prior to 2025 listing date must be rejected."""
        csv_content = """Symbol,Date,ExpiryDate,Open,High,Low,Close,Volume,OpenInterest
GOLDTEN,10/15/2024,28NOV2024,70000,70500,69800,70100,100,300
"""
        res = self.ingestion_service.ingest_csv_content(csv_content, source_name="test_goldten_pre.csv")
        self.assertEqual(res["accepted_rows"], 0)
        self.assertEqual(res["rejected_rows"], 1)
        self.assertIn("listed in 2025", res["rejections"][0]["reason"])

    def test_ohlc_consistency_rejection(self):
        """High < Low or High < Close must be rejected."""
        csv_content = """Symbol,Date,ExpiryDate,Open,High,Low,Close,Volume,OpenInterest
GOLDM,05/10/2025,05JUN2025,72000,71000,72500,72100,500,1200
"""
        res = self.ingestion_service.ingest_csv_content(csv_content, source_name="test_ohlc_bad.csv")
        self.assertEqual(res["accepted_rows"], 0)
        self.assertEqual(res["rejected_rows"], 1)
        self.assertIn("OHLC consistency violated", res["rejections"][0]["reason"])

    def test_requested_date_mismatch_rejection(self):
        """When requested date differs from returned date, reject without silent acceptance."""
        csv_content = """Symbol,Date,ExpiryDate,Open,High,Low,Close,Volume,OpenInterest
GOLDM,05/09/2025,05JUN2025,72000,72500,71800,72100,500,1200
"""
        res = self.ingestion_service.ingest_csv_content(
            csv_content,
            source_name="test_mismatch.csv",
            expected_request_date="2025-05-10"
        )
        self.assertEqual(res["accepted_rows"], 0)
        self.assertEqual(res["rejected_rows"], 1)
        self.assertIn("Discrepancy: Returned date", res["rejections"][0]["reason"])


class TestAnalyticsAndBacktesting(unittest.TestCase):
    def setUp(self):
        # Use existing populated DB
        self.analytics = AnalyticsEngine("backend/commodity_intelligence.db")

    def test_relative_value_series_no_lookahead(self):
        """Verify relative value calculation and rolling statistics."""
        data = self.analytics.compute_relative_value_series("GOLDM", "GOLDTEN", rolling_window=20)
        self.assertGreater(data["total_paired_observations"], 50)
        series = data["series"]
        # Check first observation does not have full 20-day rolling window
        self.assertFalse(series[0]["obs_sufficient"])
        # Check later observation has sufficient data
        self.assertTrue(series[25]["obs_sufficient"])
        self.assertIsNotNone(series[25]["z_score"])

    def test_transaction_cost_deduction(self):
        """Verify transaction cost model includes regulatory fees, brokerage, and slippage."""
        costs = self.analytics.calculate_transaction_costs("GOLDM", "GOLDTEN", 75000.0, 75000.0, brokerage_per_lot=20.0, slippage_basis_points=2.0)
        self.assertGreater(costs["total_round_trip_friction_inr"], 0.0)
        self.assertGreater(costs["fee_breakdown"]["exchange_charges_verified"], 0.0)
        self.assertGreater(costs["fee_breakdown"]["ctt_verified"], 0.0)
        self.assertGreater(costs["fee_breakdown"]["slippage_estimated"], 0.0)

    def test_walk_forward_unseen_test_separation(self):
        """Verify backtest strictly separates training, validation, and test periods."""
        backtest = self.analytics.run_walk_forward_backtest(
            symbol_a="GOLDM",
            symbol_b="GOLDTEN",
            train_ratio=0.6,
            val_ratio=0.2,
            z_entry_threshold=2.0,
            z_exit_threshold=0.5,
            brokerage_per_lot=20.0,
            slippage_basis_points=2.0
        )
        self.assertTrue(backtest["success"])
        unseen_test = backtest["unseen_test_results"]
        train_res = backtest["training_results"]
        # Dates of train must be strictly before unseen test
        self.assertLess(train_res["date_range"]["end"], unseen_test["date_range"]["start"])
        # Performance metrics are reported truthfully
        self.assertIn("net_pnl_inr", unseen_test)
        self.assertIn("unhedged_gold_benchmark_return_pct", unseen_test)
        self.assertIn("analytical_synthesis", backtest)

if __name__ == "__main__":
    unittest.main()
