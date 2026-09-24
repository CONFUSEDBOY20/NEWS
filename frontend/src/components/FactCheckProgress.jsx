import React from "react";
import { useApp } from "../context/AppContext";
import {
  ShieldCheck,
  CheckCircle2,
  CircleDot,
  Circle,
  FileText,
  Search,
  Database,
  Layers,
  Cpu,
  Sparkles,
  ArrowDown,
  Activity,
  Radio
} from "lucide-react";

export function FactCheckProgress() {
  const { verificationStage, language } = useApp();

  const pipelineSteps = [
    {
      id: "input",
      title: "Input",
      activeText: "Validating input stream & metadata...",
      doneText: "Input received & sanitized",
      icon: FileText
    },
    {
      id: "claim_extraction",
      title: "Claim Extraction",
      activeText: "Extracting core claims & identifying entities...",
      doneText: "Claims extracted & entities identified",
      icon: Search
    },
    {
      id: "source_discovery",
      title: "Source Discovery",
      activeText: "Scanning 500+ global verified archives & official wires...",
      doneText: "Authoritative sources & wire records found",
      icon: Database
    },
    {
      id: "evidence_search",
      title: "Evidence Search",
      activeText: "Harvesting granular citations & primary records...",
      doneText: "Evidence citations indexed & corroborated",
      icon: Search
    },
    {
      id: "cross_source_analysis",
      title: "Cross Source Analysis",
      activeText: "Comparing stance (Supports vs. Contradicts)...",
      doneText: "Cross-source stance analysis completed",
      icon: Layers
    },
    {
      id: "ai_analysis",
      title: "AI Analysis",
      activeText: "Performing semantic reasoning & forensics...",
      doneText: "AI intelligence reasoning synthesized",
      icon: Cpu
    },
    {
      id: "final_verdict",
      title: "Final Verdict",
      activeText: "Computing confidence score & assembling report...",
      doneText: "Final forensic verdict generated",
      icon: Sparkles
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 my-8 animate-fadeIn">
      <div className="rounded-3xl p-6 sm:p-8 bg-[#0D101A]/95 border border-white/[0.12] shadow-2xl shadow-black/80 backdrop-blur-2xl space-y-8">
        
        {/* Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold tracking-wider text-indigo-400 uppercase">
                  Workspace
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                TRUTHLENS VERIFICATION
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 border border-white/[0.06] text-xs font-mono text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Multi-Agent Forensic Pipeline Active</span>
          </div>
        </div>

        {/* Pipeline Flow Visualization Header */}
        <div className="hidden lg:flex items-center justify-between gap-1 p-3 bg-black/40 rounded-2xl border border-white/[0.06] text-[11px] font-mono">
          {pipelineSteps.map((step, idx) => {
            const isDone = verificationStage > idx;
            const isCurrent = verificationStage === idx;
            return (
              <React.Fragment key={step.id}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    isCurrent
                      ? "bg-indigo-600 text-white font-semibold shadow-sm"
                      : isDone
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <span className="text-emerald-400 font-bold">✓</span>
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  ) : (
                    <span>○</span>
                  )}
                  <span className="truncate max-w-[90px]">{step.title}</span>
                </div>
                {idx < pipelineSteps.length - 1 && (
                  <span className="text-slate-600">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>ANALYSIS PROGRESS</span>
            <span className="text-indigo-300 font-semibold">
              {Math.min(100, Math.round(((verificationStage + 1) / pipelineSteps.length) * 100))}%
            </span>
          </div>
          <div className="relative w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/[0.08]">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${((verificationStage + 1) / pipelineSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Live Stage-by-Stage Forensic State Feed */}
        <div className="space-y-3">
          {pipelineSteps.map((step, idx) => {
            const isDone = verificationStage > idx;
            const isCurrent = verificationStage === idx;
            const isPending = verificationStage < idx;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-start justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
                  isCurrent
                    ? "bg-indigo-950/30 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10"
                    : isDone
                    ? "bg-white/[0.02] border-white/[0.06] text-slate-300"
                    : "opacity-40 border-transparent text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {/* Status Indicator Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isDone
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : isCurrent
                        ? "bg-indigo-600 text-white font-bold animate-pulse shadow-lg shadow-indigo-600/30"
                        : "bg-white/[0.04] text-slate-600 border border-white/[0.04]"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <CircleDot className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {/* Stage Text & Details */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold tracking-wide">
                        {step.title}
                      </span>
                      {isDone && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20">
                          COMPLETED
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.2 rounded border border-indigo-500/30 animate-pulse">
                          EXECUTING
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {isDone ? step.doneText : isCurrent ? step.activeText : "Pending pipeline trigger..."}
                    </p>
                  </div>
                </div>

                <Icon className={`w-4 h-4 shrink-0 hidden sm:block ${isCurrent ? "text-indigo-400" : isDone ? "text-emerald-400" : "text-slate-600"}`} />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
