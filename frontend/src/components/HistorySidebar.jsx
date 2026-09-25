import React from "react";
import { useApp } from "../context/AppContext";
import { X, Trash2, Clock, ArrowRight, History } from "lucide-react";

export function HistorySidebar() {
  const {
    showHistoryDrawer,
    setShowHistoryDrawer,
    history,
    clearHistory,
    setVerificationResult,
    setActiveView,
    t
  } = useApp();

  if (!showHistoryDrawer) return null;

  const handleSelectHistory = (item) => {
    if (item.resultData) {
      setVerificationResult(item.resultData);
      setActiveView("fact-check");
      setShowHistoryDrawer(false);
    }
  };

  const getVerdictDot = (verdict) => {
    switch (verdict) {
      case "TRUE":
      case "MOSTLY TRUE":
        return "bg-emerald-500";
      case "PARTLY TRUE":
      case "MISLEADING":
        return "bg-amber-500";
      case "FALSE":
        return "bg-rose-500";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#0D121E] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl p-6 space-y-4 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight font-sans">
                {t.navHistory || "Verification History"}
              </h3>
              <p className="text-xs text-slate-500">
                Recent claims verified in this browser session
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowHistoryDrawer(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="text-center py-14 text-slate-400 text-xs">
              No verification history recorded yet.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectHistory(item)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.06] cursor-pointer transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getVerdictDot(item.verdict)}`} />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.verdict}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {item.confidence}% confidence
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {item.input}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="capitalize">Type: {item.type}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                    View full report <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {history.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              {history.length} record{history.length > 1 ? "s" : ""} saved locally
            </span>
            <button
              onClick={clearHistory}
              className="py-1.5 px-3 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
