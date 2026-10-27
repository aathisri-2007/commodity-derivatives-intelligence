"""
Official MCX Gold Contract Specifications configuration.
Source: MCX India Bullion Specifications (https://www.mcxindia.com/products/bullion/gold)
"""
from typing import Dict, Any

CONTRACT_SPECS: Dict[str, Dict[str, Any]] = {
    "GOLDM": {
        "symbol": "GOLDM",
        "name": "Gold Mini",
        "trading_unit_grams": 100.0,
        "quotation_weight_grams": 10.0,
        "purity_fineness": 0.995,
        "expiry_rule": "3rd–5th of expiry month (or preceding trading day if holiday)",
        "listing_effective_date": "2000-01-01",  # Established long-standing contract
        "standard_conversion_factor": 0.995,  # P * (10 / 10) * 0.995
        "delivery_unit_grams": 100.0,
        "price_tick": 1.0,
        "notes": "100g contract size quoted per 10g at 995 fineness."
    },
    "GOLDTEN": {
        "symbol": "GOLDTEN",
        "name": "Gold 10 Grams",
        "trading_unit_grams": 10.0,
        "quotation_weight_grams": 10.0,
        "purity_fineness": 0.999,
        "expiry_rule": "27th–31st of expiry month (or preceding trading day if holiday)",
        "listing_effective_date": "2025-01-01",  # Listed in 2025 period
        "standard_conversion_factor": 0.999,  # P * (10 / 10) * 0.999
        "delivery_unit_grams": 10.0,
        "price_tick": 1.0,
        "notes": "10g contract size quoted per 10g at 999 fineness. Available only from 2025 listing period onwards."
    },
    "GOLDGUINEA": {
        "symbol": "GOLDGUINEA",
        "name": "Gold Guinea (8g)",
        "trading_unit_grams": 8.0,
        "quotation_weight_grams": 8.0,
        "purity_fineness": 0.999,
        "expiry_rule": "27th–31st of expiry month (or preceding trading day if holiday)",
        "listing_effective_date": "2008-01-01",
        # Notice: Per specification section 7:
        # If quoted per 8g, normalized to 10g fine gold = P * (10/8) * 0.999 = P * 1.24875.
        # Alternatively, if quoted on 10g basis directly in specific bhavcopies or challenge baseline factor:
        "quotation_conversion_factor_to_10g": 1.24875,  # (10.0 / 8.0) * 0.999
        "challenge_baseline_factor": 0.999,  # Mentioned in prompt Section 7
        "standard_conversion_factor": 1.24875,
        "delivery_unit_grams": 8.0,
        "price_tick": 1.0,
        "notes": "8g contract quoted per 8 grams at 999 fineness. Normalized per 10g fine gold = P * (10/8) * 0.999."
    },
    "GOLDPETAL": {
        "symbol": "GOLDPETAL",
        "name": "Gold Petal (1g)",
        "trading_unit_grams": 1.0,
        "quotation_weight_grams": 1.0,
        "purity_fineness": 0.999,
        "expiry_rule": "27th–31st of expiry month (or preceding trading day if holiday)",
        "listing_effective_date": "2011-01-01",
        # If quoted per 1g, normalized to 10g fine gold = P * (10/1) * 0.999 = P * 9.99.
        # Alternatively, if raw quoted per 10g or challenge baseline:
        "quotation_conversion_factor_to_10g": 9.99,  # (10.0 / 1.0) * 0.999
        "challenge_baseline_factor": 0.999,
        "standard_conversion_factor": 9.99,
        "delivery_unit_grams": 1.0,
        "price_tick": 1.0,
        "notes": "1g micro contract quoted per 1 gram at 999 fineness. Normalized per 10g fine gold = P * (10/1) * 0.999."
    }
}

SUPPORTED_SYMBOLS = set(CONTRACT_SPECS.keys())
