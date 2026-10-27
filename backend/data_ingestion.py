"""
Data Ingestion and Schema Validation Engine for MCX Daily Bhavcopy.
Handles both synthetic test fixtures and real MCX Bhavcopy downloads
with flexible column-name aliases (Volume(Lots), Open Interest(Lots), etc.)
and automatic filtering of option contracts (CE/PE).
"""

import csv
import io
import re
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
from backend.contract_specs import CONTRACT_SPECS, SUPPORTED_SYMBOLS
from backend.normalization import default_engine, weight_engine
from backend.database import get_db_connection


MONTH_MAP = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12
}


def parse_compact_expiry(expiry_str: str) -> Optional[str]:
    """
    Parses compact expiry dates such as '04SEP2026', '27MAR2025', '05JUN2025',
    or ISO '2026-09-04' or '02-Jan-2024' style.
    Returns ISO 'YYYY-MM-DD' or None if invalid.
    """
    if not expiry_str:
        return None
    val = expiry_str.strip().upper()

    # ISO YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", val):
        try:
            datetime.strptime(val, "%Y-%m-%d")
            return val
        except ValueError:
            return None

    # Compact e.g. 04SEP2026 or 4SEP2026
    compact_match = re.match(r"^(\d{1,2})([A-Z]{3})(\d{4})$", val)
    if compact_match:
        day_str, mon_str, year_str = compact_match.groups()
        day = int(day_str)
        year = int(year_str)
        if mon_str in MONTH_MAP:
            month = MONTH_MAP[mon_str]
            try:
                dt = datetime(year, month, day)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                return None

    # DD-MM-YYYY or DD/MM/YYYY or MM/DD/YYYY or DD-MMM-YYYY
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%d-%b-%Y", "%d %b %Y"):
        try:
            dt = datetime.strptime(val, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


def parse_trade_date(date_str: str, preferred_format: str = "MM/DD/YYYY") -> Optional[str]:
    """
    Parses trade date. Supports MM/DD/YYYY, DD/MM/YYYY, ISO YYYY-MM-DD,
    and DD-MMM-YYYY (e.g. 02-Jan-2024) which is common in real MCX downloads.
    Returns ISO 'YYYY-MM-DD' or None.
    """
    if not date_str:
        return None
    val = str(date_str).strip()

    if re.match(r"^\d{4}-\d{2}-\d{2}$", val):
        try:
            datetime.strptime(val, "%Y-%m-%d")
            return val
        except ValueError:
            return None

    formats = ["%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y", "%m-%d-%Y", "%d-%b-%Y", "%d %b %Y", "%d-%b-%y"]
    if preferred_format == "DD/MM/YYYY":
        formats = ["%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y", "%d-%b-%Y", "%d %b %Y", "%d-%b-%y"]

    for fmt in formats:
        try:
            dt = datetime.strptime(val, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


def _to_float(raw) -> Optional[float]:
    if raw is None:
        return None
    s = str(raw).replace(",", "").replace("%", "").strip()
    if s == "" or s.upper() in ("-", "NA", "N/A", "NULL", "NONE"):
        return None
    try:
        return float(s)
    except (ValueError, AttributeError):
        return None


def _to_int(raw) -> Optional[int]:
    f = _to_float(raw)
    if f is None:
        return None
    try:
        return int(f)
    except (ValueError, OverflowError):
        return None


class BhavcopyIngestionService:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path

    def ingest_csv_content(
        self,
        csv_text: str,
        source_name: str = "bhavcopy_upload.csv",
        date_format_hint: str = "MM/DD/YYYY",
        expected_request_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parses and validates MCX Bhavcopy CSV content.
        Handles real MCX bhavcopy column names: Volume(Lots), Open Interest(Lots), Expiry Date, etc.
        Skips option contracts (CE/PE and 'OPT' instrument names).
        """
        file_hash = hashlib.sha256(csv_text.encode("utf-8")).hexdigest()[:16]

        conn = get_db_connection(self.db_path) if self.db_path else get_db_connection()
        cursor = conn.cursor()

        now_iso = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO ingestion_runs (source_name, file_hash, notes, created_at)
            VALUES (?, ?, ?, ?);
        """, (source_name, file_hash, f"Format hint: {date_format_hint}", now_iso))
        run_id = cursor.lastrowid

        reader = csv.DictReader(io.StringIO(csv_text))

        if not reader.fieldnames:
            conn.close()
            return {
                "success": False,
                "error": "Empty or invalid CSV file. No headers found."
            }

        # Normalize headers: strip, remove non-alphanumeric, lowercase
        raw_headers = [h.strip() for h in reader.fieldnames if h]
        normalized_header_map = {}
        for h in raw_headers:
            clean_key = re.sub(r"[^a-zA-Z0-9]", "", h).lower()
            normalized_header_map[clean_key] = h

        # Alias map — handles synthetic fixtures and real MCX bhavcopy columns
        FIELD_ALIASES = {
            "symbol":         ["symbol", "sym", "scrip", "tradingsymbol"],
            "date":           ["date", "tradedate", "tradingdate", "dt"],
            "expirydate":     ["expirydate", "expiry", "expirydt"],
            "open":           ["open", "openprice", "openingprice"],
            "high":           ["high", "highprice"],
            "low":            ["low", "lowprice"],
            "close":          ["close", "closeprice", "closingprice", "settlementprice", "settleprice"],
            "volume":         ["volume", "vol", "tradedvolume", "noofcontracts", "noofcontract",
                               "contractstraded", "contracttraded", "quantity", "totalvolume",
                               "volumelots", "volumeinlots", "volumelot"],
            "openinterest":   ["openinterest", "oi", "openint", "openintrest",
                               "openinterestlots", "openinterestlot"],
            "instrumentname": ["instrumentname", "instrument", "instrname"],
            "optiontype":     ["optiontype", "opttype", "option"],
        }

        resolved = {}
        for canonical, aliases in FIELD_ALIASES.items():
            for alias in aliases:
                if alias in normalized_header_map:
                    resolved[canonical] = normalized_header_map[alias]
                    break

        required_keys = ["symbol", "date", "expirydate", "open", "high", "low", "close", "volume", "openinterest"]
        missing_fields = [k for k in required_keys if k not in resolved]

        if missing_fields:
            cursor.execute("""
                UPDATE ingestion_runs
                SET notes = ?, rejected_rows = 1
                WHERE id = ?;
            """, (f"Missing required columns: {', '.join(missing_fields)}", run_id))
            conn.commit()
            conn.close()
            return {
                "success": False,
                "error": f"Missing required Bhavcopy fields: {', '.join(missing_fields)}. "
                         f"Detected headers: {list(normalized_header_map.keys())}. "
                         f"Expected aliases include Symbol, Date, ExpiryDate, Open, High, Low, Close, Volume, OpenInterest."
            }

        total_rows = 0
        accepted_rows = 0
        rejected_rows = 0
        duplicate_rows = 0
        rejections: List[Dict[str, Any]] = []
        parsed_dates = set()

        sym_col = resolved["symbol"]
        date_col = resolved["date"]
        exp_col = resolved["expirydate"]
        open_col = resolved["open"]
        high_col = resolved["high"]
        low_col = resolved["low"]
        close_col = resolved["close"]
        vol_col = resolved["volume"]
        oi_col = resolved["openinterest"]

        # Optional columns — used to filter options rows out of real MCX bhavcopy
        instrument_col = resolved.get("instrumentname")
        option_col = resolved.get("optiontype")

        for row_idx, row in enumerate(reader, start=2):
            total_rows += 1

            # Skip option contracts — only futures are valid inputs
            if instrument_col:
                instr_val = (row.get(instrument_col, "") or "").strip().upper()
                if instr_val and "OPT" in instr_val:
                    continue
            if option_col:
                opt_val = (row.get(option_col, "") or "").strip().upper()
                if opt_val in ("CE", "PE", "C", "P"):
                    continue

            raw_sym = row.get(sym_col, "")
            raw_date = row.get(date_col, "")
            raw_exp = row.get(exp_col, "")
            raw_open = row.get(open_col, "")
            raw_high = row.get(high_col, "")
            raw_low = row.get(low_col, "")
            raw_close = row.get(close_col, "")
            raw_vol = row.get(vol_col, "")
            raw_oi = row.get(oi_col, "")

            # Audit raw observation
            cursor.execute("""
                INSERT INTO raw_observations
                (ingestion_run_id, source_file, raw_symbol, raw_date, raw_expiry, raw_open, raw_high, raw_low, raw_close, raw_volume, raw_open_interest, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (run_id, source_name, str(raw_sym), str(raw_date), str(raw_exp),
                  str(raw_open), str(raw_high), str(raw_low), str(raw_close),
                  str(raw_vol), str(raw_oi), now_iso))

            # Trim symbol and validate against the 4 gold contracts
            symbol = str(raw_sym).strip().upper() if raw_sym else ""
            if symbol not in SUPPORTED_SYMBOLS:
                rejected_rows += 1
                reason = f"Symbol '{raw_sym}' is not in the supported MCX Gold universe ({', '.join(sorted(SUPPORTED_SYMBOLS))})"
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            # Parse and validate trade date
            trade_date = parse_trade_date(raw_date, date_format_hint)
            if not trade_date:
                rejected_rows += 1
                reason = f"Invalid trade date format '{raw_date}'. Could not parse using {date_format_hint}, DD-MMM-YYYY, or ISO formats."
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            if expected_request_date and trade_date != expected_request_date:
                rejected_rows += 1
                reason = f"Discrepancy: Returned date '{trade_date}' differs from requested date '{expected_request_date}'. MCX rollbacks/holiday defaults rejected."
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            # GOLDTEN pre-2025 listing enforcement
            if symbol == "GOLDTEN" and trade_date < CONTRACT_SPECS["GOLDTEN"]["listing_effective_date"]:
                rejected_rows += 1
                reason = f"GOLDTEN was listed in 2025 (effective {CONTRACT_SPECS['GOLDTEN']['listing_effective_date']}). Pre-listing observation on {trade_date} is invalid/fabricated."
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            # Parse expiry
            expiry_date = parse_compact_expiry(raw_exp)
            if not expiry_date:
                rejected_rows += 1
                reason = f"Invalid expiry date '{raw_exp}'. Expected compact (e.g. 04SEP2026), DD-MMM-YYYY, or ISO format."
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            if expiry_date < trade_date:
                rejected_rows += 1
                reason = f"Expired contract observation: Expiry date ({expiry_date}) is prior to trade date ({trade_date})."
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            # Parse numeric fields
            open_p = _to_float(raw_open)
            high_p = _to_float(raw_high)
            low_p = _to_float(raw_low)
            close_p = _to_float(raw_close)

            if open_p is None or high_p is None or low_p is None or close_p is None:
                rejected_rows += 1
                reason = f"Non-numeric OHLC values: Open='{raw_open}', High='{raw_high}', Low='{raw_low}', Close='{raw_close}'."
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            volume = _to_int(raw_vol)
            oi = _to_int(raw_oi)
            if volume is None:
                volume = 0
            if oi is None:
                oi = 0

            if open_p <= 0 or high_p <= 0 or low_p <= 0 or close_p <= 0:
                rejected_rows += 1
                reason = f"Non-positive prices found: O={open_p}, H={high_p}, L={low_p}, C={close_p}."
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            if not (high_p >= low_p and high_p >= open_p and high_p >= close_p and low_p <= open_p and low_p <= close_p):
                rejected_rows += 1
                reason = f"OHLC consistency violated: High ({high_p}) must be >= Open ({open_p}), Close ({close_p}), Low ({low_p}), and Low ({low_p}) must be <= all."
                self._record_rejection(cursor, run_id, source_name, row_idx, raw_sym, raw_date, raw_exp, reason, str(row), now_iso)
                rejections.append({"row": row_idx, "symbol": raw_sym, "reason": reason})
                continue

            t_dt = datetime.strptime(trade_date, "%Y-%m-%d")
            e_dt = datetime.strptime(expiry_date, "%Y-%m-%d")
            days_to_exp = (e_dt - t_dt).days

            # Duplicate check
            cursor.execute("""
                SELECT id FROM validated_prices
                WHERE symbol = ? AND trade_date = ? AND expiry_date = ?;
            """, (symbol, trade_date, expiry_date))
            if cursor.fetchone():
                duplicate_rows += 1
                continue

            # Insert validated price
            cursor.execute("""
                INSERT INTO validated_prices
                (ingestion_run_id, symbol, trade_date, expiry_date, open_price, high_price, low_price, close_price, volume, open_interest, days_to_expiry, source_file, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (run_id, symbol, trade_date, expiry_date, open_p, high_p, low_p, close_p, volume, oi, days_to_exp, source_name, now_iso))
            price_id = cursor.lastrowid

            # Normalize and insert
            norm_challenge = default_engine.normalize(symbol, close_p)
            norm_weight = weight_engine.normalize(symbol, close_p)

            cursor.execute("""
                INSERT INTO normalized_prices
                (price_id, symbol, trade_date, expiry_date, quoted_price, normalized_close_challenge, normalized_close_weight, contract_notional_value, conversion_factor, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                price_id,
                symbol,
                trade_date,
                expiry_date,
                close_p,
                norm_challenge["normalized_price_per_10g_fine"],
                norm_weight["normalized_price_per_10g_fine"],
                norm_challenge["contract_notional_value"],
                norm_challenge["conversion_multiplier"],
                now_iso
            ))

            accepted_rows += 1
            parsed_dates.add(trade_date)

        # Finalize run record
        date_start = min(parsed_dates) if parsed_dates else None
        date_end = max(parsed_dates) if parsed_dates else None

        cursor.execute("""
            UPDATE ingestion_runs
            SET total_rows = ?, accepted_rows = ?, rejected_rows = ?, duplicate_rows = ?,
                date_coverage_start = ?, date_coverage_end = ?
            WHERE id = ?;
        """, (total_rows, accepted_rows, rejected_rows, duplicate_rows, date_start, date_end, run_id))

        conn.commit()
        conn.close()

        return {
            "success": True,
            "ingestion_run_id": run_id,
            "source_name": source_name,
            "total_rows_processed": total_rows,
            "accepted_rows": accepted_rows,
            "rejected_rows": rejected_rows,
            "duplicate_rows": duplicate_rows,
            "date_coverage_start": date_start,
            "date_coverage_end": date_end,
            "rejections": rejections[:50]
        }

    def _record_rejection(self, cursor, run_id, source_file, row_num, raw_sym, raw_date, raw_exp, reason, raw_line, now_iso):
        cursor.execute("""
            INSERT INTO ingestion_rejections
            (ingestion_run_id, source_file, row_number, raw_symbol, raw_date, raw_expiry, rejection_reason, raw_line_content, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (run_id, source_file, row_num, str(raw_sym), str(raw_date), str(raw_exp), reason, raw_line, now_iso))