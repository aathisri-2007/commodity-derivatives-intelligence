export interface ContractSpec {
  symbol: string;
  name: string;
  trading_unit_grams: number;
  quotation_weight_grams: number;
  purity_fineness: number;
  purity_percentage: number;
  expiry_rule: string;
  listing_effective_date: string;
  standard_conversion_factor: number;
  notes: string;
  verification_status: string;
}

export interface PriceRecord {
  id: number;
  symbol: string;
  trade_date: string;
  expiry_date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  open_interest: number;
  days_to_expiry: number;
  normalized_close_challenge: number;
  normalized_close_weight: number;
  contract_notional_value: number;
  conversion_factor: number;
}

export interface ComparisonObservation {
  trade_date: string;
  expiry_a: string;
  expiry_b: string;
  raw_price_a: number;
  raw_price_b: number;
  norm_price_a: number;
  norm_price_b: number;
  volume_a: number;
  volume_b: number;
  open_interest_a: number;
  open_interest_b: number;
  absolute_spread: number;
  percentage_spread: number;
  rolling_mean: number | null;
  rolling_std: number | null;
  z_score: number | null;
  observation_count: number;
  obs_sufficient: boolean;
}

export interface ComparisonResult {
  symbol_a: string;
  symbol_b: string;
  expiry_a: string | null;
  expiry_b: string | null;
  rolling_window: number;
  normalization_mode: string;
  total_paired_observations: number;
  date_range: {
    start: string | null;
    end: string | null;
  };
  series: ComparisonObservation[];
}

export interface TermStructureObservation {
  expiry_date: string;
  days_to_expiry: number;
  raw_close: number;
  normalized_price_10g: number;
  contract_notional: number;
  volume: number;
  open_interest: number;
  calendar_spread_vs_prev_expiry: number | null;
  annualized_carry_pct: number | null;
  proximity_risk: "HIGH" | "MEDIUM" | "LOW";
}

export interface TermStructureData {
  trade_date: string | null;
  curve_by_symbol: Record<string, TermStructureObservation[]>;
}

export interface SignalRecord {
  trade_date: string;
  expiry_a: string;
  expiry_b: string;
  absolute_spread: number;
  percentage_spread: number;
  z_score: number | null;
  status: "NO_SIGNAL" | "WATCH" | "UNUSUAL_PREMIUM" | "UNUSUAL_DISCOUNT" | "INSUFFICIENT_DATA" | "LIQUIDITY_OR_EXPIRY_RISK" | "DATA_QUALITY_WARNING";
  is_unusual: boolean;
  is_tradeable: boolean;
  reason: string;
  confidence: number;
  warnings: string[];
  observation_count: number;
}

export interface SignalsResponse {
  symbol_a: string;
  symbol_b: string;
  z_threshold: number;
  min_volume: number;
  min_oi: number;
  total_signals_evaluated: number;
  unusual_signals_count: number;
  actionable_signals_count: number;
  signals: SignalRecord[];
}

export interface BacktestTrade {
  entry_date: string;
  exit_date: string;
  position_type: string;
  entry_z: number;
  exit_z: number;
  gross_pnl: number;
  friction_costs: number;
  net_pnl: number;
  return_pct: number;
  holding_days: number;
  exit_reason: string;
}

export interface BacktestPeriodResult {
  period: string;
  date_range: {
    start: string | null;
    end: string | null;
  };
  total_observations: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  gross_pnl_inr: number;
  total_friction_inr: number;
  net_pnl_inr: number;
  strategy_return_pct: number;
  unhedged_gold_benchmark_return_pct: number;
  alpha_vs_gold_benchmark_pct: number;
  max_drawdown_pct: number;
  average_holding_period_days: number;
  trades: BacktestTrade[];
  skipped_trades: Array<{ date: string; z_score: number; reason: string }>;
  equity_curve: Array<{ date: string; equity: number; gold_benchmark: number }>;
}

export interface BacktestResponse {
  success: boolean;
  error?: string;
  pair?: string;
  parameters_frozen?: Record<string, any>;
  unseen_test_results: BacktestPeriodResult;
  validation_results: BacktestPeriodResult;
  training_results: BacktestPeriodResult;
  analytical_synthesis: string;
  edge_survived_costs: boolean;
}

export interface DataStatus {
  total_validated_prices: number;
  date_coverage: {
    start: string | null;
    end: string | null;
  };
  coverage_by_symbol: Array<{
    symbol: string;
    count: number;
    start_date: string;
    end_date: string;
    distinct_expiries: number;
  }>;
  recent_ingestion_runs: Array<{
    id: number;
    source_name: string;
    total_rows: number;
    accepted_rows: number;
    rejected_rows: number;
    duplicate_rows: number;
    date_coverage_start: string;
    date_coverage_end: string;
    notes: string;
    created_at: string;
  }>;
  recent_rejections: Array<{
    id: number;
    row_number: number;
    raw_symbol: string;
    raw_date: string;
    raw_expiry: string;
    rejection_reason: string;
    created_at: string;
  }>;
}
