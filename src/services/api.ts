import {
  ContractSpec,
  PriceRecord,
  ComparisonResult,
  TermStructureData,
  SignalsResponse,
  BacktestResponse,
  DataStatus,
} from "../types";

const BASE_URL = "/api";

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error("API health check failed");
  return res.json();
}

export async function fetchContracts(): Promise<ContractSpec[]> {
  const res = await fetch(`${BASE_URL}/contracts`);
  if (!res.ok) throw new Error("Failed to fetch contract specifications");
  const data = await res.json();
  return data.contracts || [];
}

export async function fetchDataStatus(): Promise<DataStatus> {
  const res = await fetch(`${BASE_URL}/data/status`);
  if (!res.ok) throw new Error("Failed to fetch data status");
  return res.json();
}

export async function fetchPrices(params?: {
  symbol?: string;
  date?: string;
  limit?: number;
  offset?: number;
}): Promise<PriceRecord[]> {
  const query = new URLSearchParams();
  if (params?.symbol) query.set("symbol", params.symbol);
  if (params?.date) query.set("date", params.date);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const res = await fetch(`${BASE_URL}/prices?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch price records");
  const data = await res.json();
  return data.prices || [];
}

export async function fetchComparison(params: {
  symbol_a: string;
  symbol_b: string;
  expiry_a?: string;
  expiry_b?: string;
  window?: number;
  norm_mode?: string;
}): Promise<ComparisonResult> {
  const query = new URLSearchParams();
  query.set("symbol_a", params.symbol_a);
  query.set("symbol_b", params.symbol_b);
  if (params.expiry_a) query.set("expiry_a", params.expiry_a);
  if (params.expiry_b) query.set("expiry_b", params.expiry_b);
  if (params.window) query.set("window", String(params.window));
  if (params.norm_mode) query.set("norm_mode", params.norm_mode);

  const res = await fetch(`${BASE_URL}/comparison?${query.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to load comparison data");
  }
  return data.comparison;
}

export async function fetchTermStructure(date?: string): Promise<TermStructureData> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const res = await fetch(`${BASE_URL}/term-structure${query}`);
  if (!res.ok) throw new Error("Failed to fetch term structure");
  const data = await res.json();
  return data.term_structure;
}

export async function fetchSignals(params: {
  symbol_a: string;
  symbol_b: string;
  z_threshold?: number;
  min_volume?: number;
  min_oi?: number;
  window?: number;
}): Promise<SignalsResponse> {
  const query = new URLSearchParams();
  query.set("symbol_a", params.symbol_a);
  query.set("symbol_b", params.symbol_b);
  if (params.z_threshold !== undefined) query.set("z_threshold", String(params.z_threshold));
  if (params.min_volume !== undefined) query.set("min_volume", String(params.min_volume));
  if (params.min_oi !== undefined) query.set("min_oi", String(params.min_oi));
  if (params.window !== undefined) query.set("window", String(params.window));

  const res = await fetch(`${BASE_URL}/signals?${query.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch signals");
  }
  return data.signals;
}

export async function runBacktest(params: {
  symbol_a: string;
  symbol_b: string;
  train_ratio?: number;
  val_ratio?: number;
  z_entry_threshold?: number;
  z_exit_threshold?: number;
  rolling_window?: number;
  brokerage_per_lot?: number;
  slippage_basis_points?: number;
  initial_capital?: number;
}): Promise<BacktestResponse> {
  const res = await fetch(`${BASE_URL}/backtest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Backtest execution failed");
  }
  return data;
}

export async function uploadBhavcopy(
  file: File,
  dateFormat: string = "MM/DD/YYYY",
  expectedDate?: string
): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const query = new URLSearchParams({ date_format: dateFormat });
  if (expectedDate) query.set("expected_date", expectedDate);

  const res = await fetch(`${BASE_URL}/data/upload?${query.toString()}`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "CSV upload and ingestion failed");
  }
  return data;
}

export async function resetSampleData(): Promise<any> {
  const res = await fetch(`${BASE_URL}/data/reset-sample`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to reset sample data");
  }
  return data;
}
