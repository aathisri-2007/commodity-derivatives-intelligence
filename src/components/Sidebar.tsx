import React from "react";
import {
  LayoutDashboard,
  GitCompare,
  TrendingUp,
  ShieldAlert,
  FlaskConical,
  Database,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
}) => {
  const groups = [
    {
      label: "Market",
      items: [
        { id: "overview",   label: "Overview",   icon: LayoutDashboard },
        { id: "comparison", label: "Comparison", icon: GitCompare },
        { id: "historical", label: "Historical", icon: TrendingUp },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { id: "signals",     label: "Signals",     icon: ShieldAlert },
        { id: "backtesting", label: "Backtesting", icon: FlaskConical },
      ],
    },
    {
      label: "System",
      items: [
        { id: "data",        label: "Data",        icon: Database },
        { id: "methodology", label: "Methodology", icon: BookOpen },
      ],
    },
  ];

  return (
    <aside
      className={`bg-white border-r border-stone-200/80 flex flex-col justify-between transition-all duration-200 z-40 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div>
        {/* Brand header */}
        <div className="h-16 border-b border-stone-200/80 flex items-center justify-between px-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-sm">
                <span className="text-white font-display text-sm tracking-tight">Au</span>
              </div>
              <div>
                <div className="text-[12px] font-semibold text-stone-900 tracking-tight leading-none">
                  Commodity Intel
                </div>
                <div className="text-[9px] text-stone-400 font-mono uppercase tracking-wider mt-1">
                  MCX Gold Analytics
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-display text-sm">Au</span>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition"
              title="Collapse"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="w-full py-2 text-stone-400 hover:text-stone-700 transition"
            title="Expand"
          >
            <ChevronRight className="w-3.5 h-3.5 mx-auto" />
          </button>
        )}

        {/* Grouped nav */}
        <nav className="p-3">
          {groups.map((group, gIdx) => (
            <div key={group.label} className={gIdx > 0 ? "mt-5" : ""}>
              {!collapsed && (
                <div className="px-2 py-1 text-[9px] font-semibold text-stone-400 tracking-[0.15em] uppercase">
                  {group.label}
                </div>
              )}
              {collapsed && gIdx > 0 && (
                <div className="border-t border-stone-200 my-2"></div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12.5px] font-medium transition relative ${
                        isActive
                          ? "bg-amber-50 text-amber-900"
                          : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-amber-600 rounded-r"></span>
                      )}
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? "text-amber-700" : "text-stone-500"
                        }`}
                      />
                      {!collapsed && <span className="tracking-tight">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-stone-200/80">
          <div className="text-[10px] font-mono text-stone-500 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-stone-400">Universe</span>
              <span className="text-stone-700">4 contracts</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-400">GOLDTEN</span>
              <span className="text-amber-700 font-medium">2025+</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-400">Normalization</span>
              <span className="text-stone-700">10g fine</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};