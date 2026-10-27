"""
Normalization Engine for MCX Gold Contracts.

Converts exchange-quoted prices to a standardized 10 grams of fine-gold equivalent:
Formula: Normalized Price = P * (10 / Q) * F
where:
  P = exchange-quoted price
  Q = quotation weight in grams
  F = fineness decimal (0.995 for GOLDM, 0.999 for GOLDTEN, GOLDGUINEA, GOLDPETAL)

Also supports the Challenge Baseline Convention mode:
  GOLDM: P * 0.995
  GOLDTEN: P * 0.999
  GOLDGUINEA: P * 0.999 (when quoted on a standardized 10g basis)
  GOLDPETAL: P * 0.999 (when quoted on a standardized 10g basis)
"""
from typing import Dict, Any, Optional
from backend.contract_specs import CONTRACT_SPECS

class NormalizationEngine:
    def __init__(self, mode: str = "physical_weight"):
        """
        mode:
          - "physical_weight": P * (10 / Q) * F (converts actual contract quotation weight Q to 10g fine gold)
          - "challenge_baseline": P * F (as stated in prompt section 7 initial baseline factors)
        """
        self.mode = mode

    def get_factors(self, symbol: str) -> Dict[str, Any]:
        sym = symbol.strip().upper()
        if sym not in CONTRACT_SPECS:
            raise ValueError(f"Unknown contract symbol: '{symbol}'. Must be one of {list(CONTRACT_SPECS.keys())}")
        
        spec = CONTRACT_SPECS[sym]
        q = spec["quotation_weight_grams"]
        f = spec["purity_fineness"]
        
        if self.mode == "challenge_baseline":
            weight_factor = 1.0
            conversion_multiplier = f
            formula_str = f"P * {f}"
        else:
            weight_factor = 10.0 / q
            conversion_multiplier = weight_factor * f
            formula_str = f"P * (10 / {q}) * {f} = P * {conversion_multiplier:.5f}"

        return {
            "symbol": sym,
            "quotation_weight_grams": q,
            "trading_unit_grams": spec["trading_unit_grams"],
            "purity_fineness": f,
            "weight_factor": weight_factor,
            "conversion_multiplier": conversion_multiplier,
            "formula_str": formula_str,
            "mode": self.mode
        }

    def normalize(self, symbol: str, quoted_price: float) -> Dict[str, Any]:
        """
        Calculates normalized price and notional contract value with full mathematical audit trail.
        """
        if quoted_price is None or quoted_price <= 0:
            raise ValueError(f"Invalid nonpositive quoted price: {quoted_price}")

        factors = self.get_factors(symbol)
        norm_price = quoted_price * factors["conversion_multiplier"]
        
        # Actual contract notional value:
        # Each contract has a trading unit in grams.
        # Price P is quoted per Q grams.
        # Notional = P * (trading_unit_grams / quotation_weight_grams)
        trading_unit = factors["trading_unit_grams"]
        quotation_weight = factors["quotation_weight_grams"]
        notional_value = quoted_price * (trading_unit / quotation_weight)

        return {
            "symbol": factors["symbol"],
            "quoted_price": round(quoted_price, 2),
            "normalized_price_per_10g_fine": round(norm_price, 2),
            "contract_notional_value": round(notional_value, 2),
            "quotation_weight_grams": quotation_weight,
            "trading_unit_grams": trading_unit,
            "purity_fineness": factors["purity_fineness"],
            "conversion_multiplier": round(factors["conversion_multiplier"], 5),
            "formula": factors["formula_str"],
            "audit_trail": {
                "step1": f"Raw exchange-quoted price P = ₹{quoted_price:,.2f}",
                "step2": f"Quotation base Q = {quotation_weight}g, Target reference = 10g fine gold",
                "step3": f"Purity fineness F = {factors['purity_fineness']} ({(factors['purity_fineness']*100):.1f}% pure)",
                "step4": f"Normalized 10g fine price = ₹{quoted_price:,.2f} × {factors['conversion_multiplier']:.5f} = ₹{norm_price:,.2f}",
                "step5": f"Contract Notional = ₹{quoted_price:,.2f} × ({trading_unit}g / {quotation_weight}g) = ₹{notional_value:,.2f}"
            }
        }

# Default instances
default_engine = NormalizationEngine(mode="challenge_baseline")
weight_engine = NormalizationEngine(mode="physical_weight")
