import React from "react";
import { useApp } from "../context/AppContext";
import { X, Trash2, Clock, CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowRight } from "lucide-react";

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
        return "bg-emerald-400";
      case "PARTLY TRUE":
      case "MISLEADING":
        return "bg-amber-400";
      case "FALSE":
        return "bg-rose-400";
      default:
        return "bg-slate-400";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-md animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md glass-panel border-l border-white/[0.08] p-6 flex flex-col justify-between shadow-2xl backdrop-blur-2xl bg-[#0D101A]/95">
          
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t.navHistory}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                  {history.length}
                </span>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="mt-4 space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No verification history in this browser session.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistory(item)}
                    className="p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-indigo-500/30 cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${getVerdictDot(item.verdict)}`} />
                        <span className="text-[11px] font-mono font-bold text-slate-200">
                          {item.verdict}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {item.confidence}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {item.input}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                      <span className="capitalize">Type: {item.type}</span>
                      <span className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        Open Report <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Controls */}
          {history.length > 0 && (
            <div className="pt-4 border-t border-white/[0.06]">
              <button
                onClick={clearHistory}
                className="w-full py-2.5 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 text-slate-400 hover:text-rose-300 border border-white/[0.06] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Verification History</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
