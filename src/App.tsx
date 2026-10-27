import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { OverviewView } from "./components/OverviewView";
import { ContractComparisonView } from "./components/ContractComparisonView";
import { HistoricalAnalysisView } from "./components/HistoricalAnalysisView";
import { SignalIntelligenceView } from "./components/SignalIntelligenceView";
import { BacktestingLabView } from "./components/BacktestingLabView";
import { DataManagementView } from "./components/DataManagementView";
import { MethodologyView } from "./components/MethodologyView";
import { fetchContracts, fetchDataStatus, fetchPrices } from "./services/api";
import { ContractSpec, DataStatus, PriceRecord } from "./types";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const [contracts, setContracts] = useState<ContractSpec[]>([]);
  const [dataStatus, setDataStatus] = useState<DataStatus | null>(null);
  const [prices, setPrices] = useState<PriceRecord[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      const [cData, sData, pData] = await Promise.all([
        fetchContracts(),
        fetchDataStatus(),
        fetchPrices({ limit: 200 }),
      ]);
      setContracts(cData);
      setDataStatus(sData);
      setPrices(pData);
    } catch (err: any) {
      console.error("Initial load error:", err);
      setError(
        err.message || "Failed to connect to Commodity Derivatives Intelligence backend service."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF9F6] text-stone-900 font-sans">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          dataStatus={dataStatus}
          onRefresh={loadInitialData}
          activeTab={activeTab}
          prices={prices}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {loading && !dataStatus ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-stone-500 font-mono text-[11px]">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
              <span>Connecting to local SQLite database & initializing analytics engine...</span>
            </div>
          ) : error ? (
            <div className="max-w-xl mx-auto mt-16 bg-rose-50 border border-rose-200 rounded-lg p-8 text-center space-y-4 card-shadow">
              <AlertTriangle className="w-7 h-7 text-rose-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-stone-900">Engine Connection Error</h3>
                <p className="text-[11px] text-rose-700 font-mono">{error}</p>
              </div>
              <p className="text-[12px] text-stone-500">
                Please verify the Flask backend process is running or retry connection.
              </p>
              <button
                onClick={loadInitialData}
                className="px-4 py-2 bg-white hover:bg-stone-50 text-stone-700 text-[12px] font-medium rounded-md border border-stone-300 transition"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="max-w-[1400px] mx-auto">
              {activeTab === "overview" && (
                <OverviewView
                  contracts={contracts}
                  dataStatus={dataStatus}
                  prices={prices}
                  onNavigate={setActiveTab}
                  onRefresh={loadInitialData}
                />
              )}
              {activeTab === "comparison" && (
                <ContractComparisonView contracts={contracts} />
              )}
              {activeTab === "historical" && (
                <HistoricalAnalysisView contracts={contracts} />
              )}
              {activeTab === "signals" && (
                <SignalIntelligenceView contracts={contracts} />
              )}
              {activeTab === "backtesting" && (
                <BacktestingLabView contracts={contracts} />
              )}
              {activeTab === "data" && (
                <DataManagementView dataStatus={dataStatus} onRefresh={loadInitialData} />
              )}
              {activeTab === "methodology" && (
                <MethodologyView contracts={contracts} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}