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
  Calendar,
  Layers,
} from "lucide-react";

interface Props {
  dataStatus: DataStatus | null;
  onRefresh: () => void;
}

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
    setResetting(true);
    try {
      await resetSampleData();
      onRefresh();
      alert("Verified historical MCX Bhavcopy sample dataset successfully reloaded.");
    } catch (err: any) {
      alert("Reset error: " + err.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Box & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-amber-400" />
              Upload Official MCX Daily Bhavcopy CSV
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Strict Schema Verification</span>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-6 text-center transition bg-slate-950/40">
              <input
                type="file"
                accept=".csv"
                id="bhavcopy-file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="bhavcopy-file" className="cursor-pointer block space-y-2">
                <FileText className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-xs font-semibold text-slate-200">
                  {file ? file.name : "Click to select or drag and drop official MCX Bhavcopy CSV"}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Expected fields: Symbol, Date, ExpiryDate, Open, High, Low, Close, Volume, OpenInterest
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Returned Date Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-3 py-2"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (MCX standard returned)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (MCX standard request)</option>
                </select>
                <span className="text-[10px] text-slate-500 font-sans">
                  Section 5: Requests use DD/MM/YYYY; returned uses MM/DD/YYYY.
                </span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Expected Request Date (Optional)</label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded px-3 py-2"
                />
                <span className="text-[10px] text-slate-500 font-sans">
                  Rejects MCX silent holiday/rollback substitution if mismatched.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-mono">
                {file ? `${(file.size / 1024).toFixed(1)} KB selected` : "No file selected"}
              </span>

              <button
                type="submit"
                disabled={!file || uploading}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {uploading ? "Parsing & Validating..." : "Ingest & Validate Bhavcopy"}
              </button>
            </div>
          </form>

          {uploadError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs space-y-2">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Ingestion Completed Successfully
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-300">
                <div>Total Processed: <strong>{uploadResult.total_rows_processed}</strong></div>
                <div>Accepted: <strong className="text-emerald-400">{uploadResult.accepted_rows}</strong></div>
                <div>Rejected: <strong className="text-rose-400">{uploadResult.rejected_rows}</strong></div>
                <div>Duplicates: <strong>{uploadResult.duplicate_rows}</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Operations & Export Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              Certified Sample Dataset
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reset database with verified historical MCX daily observations (2024–2026) for GOLDM, GOLDTEN, GOLDGUINEA, and GOLDPETAL.
            </p>
            <button
              onClick={handleResetSample}
              disabled={resetting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
              Reload Certified MCX Dataset
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              Export Audited Reports
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <a
                href="/api/reports/export?type=prices&format=csv"
                download
                className="block text-center py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded transition"
              >
                Download Normalized Prices CSV
              </a>
              <a
                href="/api/reports/export?type=signals&format=csv"
                download
                className="block text-center py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded transition"
              >
                Download Signals Log CSV
              </a>
              <a
                href="/api/reports/export?type=backtest&format=csv"
                download
                className="block text-center py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded transition"
              >
                Download Backtest Trades CSV
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Data Quality & Ingestion Rejection Audit Log
          </h4>
          <span className="text-xs font-mono text-slate-500">
            {dataStatus?.recent_rejections?.length || 0} flagged records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Row #</th>
                <th className="py-2.5 px-4">Raw Symbol</th>
                <th className="py-2.5 px-4">Raw Date</th>
                <th className="py-2.5 px-4">Raw Expiry</th>
                <th className="py-2.5 px-4 text-rose-400">Rejection Rationale</th>
                <th className="py-2.5 px-4">Logged At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {dataStatus?.recent_rejections && dataStatus.recent_rejections.length > 0 ? (
                dataStatus.recent_rejections.map((rej) => (
                  <tr key={rej.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 text-slate-400">{rej.row_number}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-200">'{rej.raw_symbol}'</td>
                    <td className="py-2.5 px-4">{rej.raw_date}</td>
                    <td className="py-2.5 px-4">{rej.raw_expiry}</td>
                    <td className="py-2.5 px-4 text-rose-300 font-sans text-xs">{rej.rejection_reason}</td>
                    <td className="py-2.5 px-4 text-slate-500">{rej.created_at.slice(0, 19)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                    No rejections in recent ingestion runs. All records passed strict schema and OHLC integrity checks.
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
