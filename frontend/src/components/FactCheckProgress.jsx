import React from "react";
import { useApp } from "../context/AppContext";
import {
  Check,
  CircleDot,
  Circle,
  Scan,
  Database,
  Layers,
  Search,
  Sparkles,
  FileCheck2,
} from "lucide-react";

export function FactCheckProgress() {
  const { verificationStage, activeClaimText } = useApp();

  // The 4 required checklist items for Step 2
  const checklistItems = [
    {
      id: "searching_sources",
      label: "Searching trusted sources",
      detail: "Querying institutional news wires, archives & official press registries",
      icon: Search,
      stageThreshold: 1,
    },
    {
      id: "comparing_reports",
      label: "Comparing reports",
      detail: "Evaluating stance consistency across independent editorial agencies",
      icon: Layers,
      stageThreshold: 2,
    },
    {
      id: "cross_checking_databases",
      label: "Cross-checking databases",
      detail: "Cross-referencing historical fact-checking databases & scientific registries",
      icon: Database,
      stageThreshold: 3,
    },
    {
      id: "analyzing_evidence",
      label: "Analyzing evidence",
      detail: "Synthesizing consensus and computing probabilistic confidence score",
      icon: Sparkles,
      stageThreshold: 4,
    },
  ];

  // Calculate overall percentage
  const totalStages = 5;
  const progressPercent = Math.min(
    100,
    Math.max(12, Math.round(((verificationStage + 1) / totalStages) * 100))
  );

  const isStep1 = verificationStage === 0;

  return (
    <div className="w-full max-w-2xl mx-auto px-4 my-8 animate-fade-up">
      <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/[0.08] shadow-xl shadow-black/5 dark:shadow-black/30 space-y-6">
        
        {/* Step 1: Analyzing claim... with Animated Scanner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 dark:text-emerald-400 relative">
                <Scan className="w-4 h-4 animate-soft-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                    Analyzing claim...
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Forensic multi-source consensus engine active
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
              {progressPercent}%
            </span>
          </div>

          {/* Scanner Preview Card with sweeping beam */}
          <div className="relative rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-black/40 p-3.5 overflow-hidden">
            {/* The Animated Scanner Beam */}
            <div className="animate-scan-beam" />
            
            <div className="flex items-start gap-2.5 relative z-10">
              <FileCheck2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">
                  Input Stream under analysis
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-2 leading-relaxed">
                  "{activeClaimText || "Scanning submitted claim and metadata..."}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Progress Indicator Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>PIPELINE PROGRESS</span>
            <span>{isStep1 ? "STAGE 1/2: INGESTION" : "STAGE 2/2: CROSS-VERIFICATION"}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-black/50 rounded-full overflow-hidden border border-slate-200/60 dark:border-white/[0.06]">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step 2: 4 Checklist Items */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
            Verification Protocol
          </span>

          {checklistItems.map((item) => {
            const isCompleted = verificationStage >= item.stageThreshold;
            const isCurrent = verificationStage === item.stageThreshold - 1 && !isStep1;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-all duration-250 ${
                  isCurrent
                    ? "bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-slate-900 dark:text-white shadow-sm"
                    : isCompleted
                    ? "bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.06] text-slate-700 dark:text-slate-300"
                    : "opacity-40 border border-transparent text-slate-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                    {isCompleted ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs animate-fadeIn shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    ) : isCurrent ? (
                      <CircleDot className="w-4 h-4 text-emerald-500 animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-semibold block font-sans">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block line-clamp-1">
                      {isCompleted
                        ? "Completed & verified"
                        : isCurrent
                        ? item.detail
                        : "Queued"}
                    </span>
                  </div>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-soft-pulse">
                    Processing
                  </span>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
