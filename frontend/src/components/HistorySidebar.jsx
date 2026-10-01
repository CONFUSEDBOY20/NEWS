import React from "react";
import { useApp } from "../context/AppContext";
import { X, Trash2, ArrowRight, History } from "lucide-react";

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

  const handleKeyDown = (e, item) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelectHistory(item);
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowHistoryDrawer(false);
    }
  };

  // Close on Escape key
  const handleDialogKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowHistoryDrawer(false);
    }
  };

  const getVerdictDot = (verdict) => {
    if (!verdict) return "bg-slate-400";
    const v = verdict.toUpperCase();
    if (v === "TRUE" || v === "VERIFIED" || v === "MOSTLY TRUE" || v === "LIKELY TRUE") return "bg-emerald-500";
    if (v === "PARTLY TRUE" || v === "MISLEADING" || v === "SUSPICIOUS") return "bg-amber-500";
    if (v === "FALSE") return "bg-rose-500";
    return "bg-slate-400";
  };

  const formatTimestamp = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Verification History"
      onClick={handleBackdropClick}
      onKeyDown={handleDialogKeyDown}
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#0D121E] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl p-6 space-y-4 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center" aria-hidden="true">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight font-sans">
                {t?.navHistory || "Verification History"}
              </h2>
              <p className="text-xs text-slate-500">
                {history.length} record{history.length !== 1 ? "s" : ""} in this session
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowHistoryDrawer(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Close history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1" role="list" aria-label="Recent verifications">
          {history.length === 0 ? (
            <div className="text-center py-14 space-y-2">
              <div className="text-slate-300 dark:text-slate-600 text-3xl" aria-hidden="true">🔍</div>
              <p className="text-slate-500 text-sm font-medium">No verification history yet.</p>
              <p className="text-slate-400 text-xs">Start by verifying a news claim above.</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                role="listitem"
                tabIndex={0}
                onClick={() => handleSelectHistory(item)}
                onKeyDown={(e) => handleKeyDown(e, item)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.06] cursor-pointer transition-all space-y-1.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                aria-label={`View report: ${item.verdict} — ${item.input?.slice(0, 60)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${getVerdictDot(item.verdict)}`} aria-hidden="true" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.verdict}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {typeof item.confidence === "number" ? `${item.confidence}%` : "—"}
                  </span>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                  {item.input}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-2">
                    <span className="capitalize">{item.type}</span>
                    {item.timestamp && (
                      <span className="font-mono">{formatTimestamp(item.timestamp)}</span>
                    )}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center gap-0.5 font-medium">
                    View report <ArrowRight className="w-2.5 h-2.5" aria-hidden="true" />
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
              {history.length} record{history.length > 1 ? "s" : ""} · local session
            </span>
            <button
              onClick={clearHistory}
              className="py-1.5 px-3 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label="Clear all verification history"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Clear History</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
