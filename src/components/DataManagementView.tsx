import React, { useState } from "react";
import { uploadBhavcopy, resetSampleData } from "../services/api";
import { DataStatus } from "../types";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Download,
  Database,
  ShieldAlert,
} from "lucide-react";

interface Props {
  dataStatus: DataStatus | null;
  onRefresh: () => void;
}

// In dev, VITE_API_URL is undefined → falls back to "/api" (Node proxy handles it)
// In production, VITE_API_URL = "https://commodity-intel-api.onrender.com/api"
const API_BASE = (import.meta as any).env?.VITE_API_URL || "/api";

export const DataManagementView: React.FC<Props> = ({ dataStatus, onRefresh }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [expectedDate, setExpectedDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const res = await uploadBhavcopy(file, dateFormat, expectedDate || undefined);
      setUploadResult(res);
      setFile(null);
      onRefresh();
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  async function handleResetSample() {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will DELETE all current data — including your real MCX uploads — and replace it with the synthetic test fixture.\n\nAre you sure you want to proceed?"
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      await resetSampleData();
      onRefresh();
      alert("Synthetic test fixture reloaded. Your real MCX data has been replaced.");
    } catch (err: any) {
      alert("Reset error: " + err.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-stone-900 tracking-tight leading-tight">
          Data Management
        </h1>
        <p className="text-[13px] text-stone-500 mt-2 max-w-2xl leading-relaxed">
          Upload real MCX Bhavcopy CSVs, audit rejected rows, and export normalized reports.
        </p>
      </div>

      {/* Upload + Export panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-stone-200/80 rounded-lg p-5 card-shadow space-y-4">
          <div className="border-b border-stone-200/80 pb-3 flex items-center justify-between">
            <h2 className="font-display text-xl text-stone-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-amber-700" />
              Upload MCX Daily Bhavcopy
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-stone-100 text-stone-600 rounded border border-stone-200">
              Strict Schema
            </span>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-stone-300 hover:border-amber-500/60 rounded-lg p-6 text-center transition bg-stone-50/40">
              <input
                type="file"
                accept=".csv"
                id="bhavcopy-file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="bhavcopy-file" className="cursor-pointer block space-y-2">
                <FileText className="w-7 h-7 text-amber-700 mx-auto" />
                <div className="text-[12px] font-semibold text-stone-700">
                  {file ? file.name : "Click to select or drag a Bhavcopy CSV"}
                </div>
                <div className="text-[10px] text-stone-500 font-mono">
                  Expected: Symbol, Date, ExpiryDate, Open, High, Low, Close, Volume, OpenInterest
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Returned Date Format
                </label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 text-stone-800 font-mono text-[12px] rounded-md px-3 py-2"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (MCX standard)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                </select>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  MCX returns MM/DD/YYYY; requests use DD/MM/YYYY
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                  Expected Request Date (Optional)
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 text-stone-800 font-mono text-[12px] rounded-md px-3 py-2"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Rejects silent holiday substitution
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-stone-500 font-mono">
                {file ? `${(file.size / 1024).toFixed(1)} KB selected` : "No file selected"}
              </span>
              <button
                type="submit"
                disabled={!file || uploading}
                className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium text-[12px] rounded-md transition shadow-sm disabled:opacity-50"
              >
                {uploading ? "Parsing & Validating..." : "Ingest & Validate"}
              </button>
            </div>
          </form>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-[12px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md space-y-2">
              <div className="text-[12px] font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Ingestion Completed
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-stone-500">Processed:</span>{" "}
                  <strong className="text-stone-900">{uploadResult.total_rows_processed}</strong>
                </div>
                <div>
                  <span className="text-stone-500">Accepted:</span>{" "}
                  <strong className="text-emerald-700">{uploadResult.accepted_rows}</strong>
                </div>
                <div>
                  <span className="text-stone-500">Rejected:</span>{" "}
                  <strong className="text-rose-700">{uploadResult.rejected_rows}</strong>
                </div>
                <div>
                  <span className="text-stone-500">Duplicates:</span>{" "}
                  <strong className="text-stone-700">{uploadResult.duplicate_rows}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: export + reset */}
        <div className="space-y-4">
          {/* Export panel */}
          <div className="bg-white border border-stone-200/80 rounded-lg p-5 card-shadow space-y-3">
            <h2 className="font-display text-lg text-stone-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-sky-700" />
              Export Reports
            </h2>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Download audited CSV reports directly from the backend API.
            </p>
            <div className="space-y-2">
              <a
                href={`${API_BASE}/reports/export?type=prices&format=csv`}
                className="flex items-center justify-between py-2 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[12px] font-mono rounded-md transition"
              >
                <span>Normalized Prices</span>
                <Download className="w-3.5 h-3.5" />
              </a>
              <a
                href={`${API_BASE}/reports/export?type=signals&format=csv`}
                className="flex items-center justify-between py-2 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[12px] font-mono rounded-md transition"
              >
                <span>Signals Log</span>
                <Download className="w-3.5 h-3.5" />
              </a>
              <a
                href={`${API_BASE}/reports/export?type=backtest&format=csv`}
                className="flex items-center justify-between py-2 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-[12px] font-mono rounded-md transition"
              >
                <span>Backtest Trades</span>
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Reset (danger) panel */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-5 card-shadow space-y-3">
            <h2 className="font-display text-lg text-amber-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Danger Zone
            </h2>
            <p className="text-[11px] text-stone-700 leading-relaxed">
              Reloading the synthetic fixture will <strong className="text-rose-700">delete all current
              data</strong> — including real MCX uploads — and replace it with fake test data. Only use
              this if you want to reset.
            </p>
            <button
              onClick={handleResetSample}
              disabled={resetting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-700 text-[12px] font-medium rounded-md transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
              Replace with Synthetic Fixture
            </button>
          </div>
        </div>
      </div>

      {/* Rejection audit log */}
      <div className="bg-white border border-stone-200/80 rounded-lg overflow-hidden card-shadow">
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between">
          <h2 className="font-display text-lg text-stone-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Rejection Audit Log
          </h2>
          <span className="text-[11px] font-mono text-stone-500">
            {dataStatus?.recent_rejections?.length || 0} flagged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-stone-50/60 border-b border-stone-200/80">
              <tr className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-4">Row</th>
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4 text-rose-700">Reason</th>
                <th className="py-3 px-4">Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {dataStatus?.recent_rejections && dataStatus.recent_rejections.length > 0 ? (
                dataStatus.recent_rejections.map((rej) => (
                  <tr key={rej.id} className="hover:bg-stone-50/60">
                    <td className="py-2.5 px-4 text-stone-500 font-mono tabular">{rej.row_number}</td>
                    <td className="py-2.5 px-4 font-mono font-medium text-stone-800">
                      {rej.raw_symbol}
                    </td>
                    <td className="py-2.5 px-4 text-stone-600 font-mono tabular">{rej.raw_date}</td>
                    <td className="py-2.5 px-4 text-stone-600 font-mono tabular">{rej.raw_expiry}</td>
                    <td className="py-2.5 px-4 text-rose-700 text-[11px]">{rej.rejection_reason}</td>
                    <td className="py-2.5 px-4 text-stone-400 font-mono text-[11px] tabular">
                      {rej.created_at?.slice(0, 19)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400 text-[12px]">
                    No rejections in recent ingestion runs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DataManagementView;