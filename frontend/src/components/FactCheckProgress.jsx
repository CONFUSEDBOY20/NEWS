import React from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Cpu,
  Database,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Activity,
  Layers
} from "lucide-react";

export function FactCheckProgress() {
  const { verificationStage, t, language } = useApp();

  const stages = [
    { label: t.stage0, detail: "Entity & predicate parsing", icon: Search },
    { label: t.stage1, detail: "Querying 500+ indexed wires", icon: Database },
    { label: t.stage2, detail: "Cross-referencing claims", icon: Layers },
    { label: t.stage3, detail: "Evaluating domain credibility", icon: ShieldCheck },
    { label: t.stage4, detail: "Multi-perspective synthesis", icon: Cpu },
    { label: t.stage5, detail: "Computing Bayesian certainty", icon: Activity },
    { label: t.stage6, detail: "Assembling audited dossier", icon: Sparkles },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 my-8 animate-fadeIn">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-2xl spotlight-glow space-y-6">
        
        {/* Header Telemetry */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Activity className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {language === "hi" ? "सत्यापन प्रगति विश्लेषण..." : "Forensic Verification Engine Active"}
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Pipeline execution • Stage {Math.min(verificationStage + 1, stages.length)} of {stages.length}
              </p>
            </div>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-end gap-1 h-5 px-2 py-1 rounded-lg bg-black/40 border border-white/[0.06]">
            <span className="w-1 bg-indigo-400 rounded-full animate-wave-1" />
            <span className="w-1 bg-cyan-400 rounded-full animate-wave-2" />
            <span className="w-1 bg-emerald-400 rounded-full animate-wave-3" />
            <span className="w-1 bg-indigo-400 rounded-full animate-wave-4" />
            <span className="w-1 bg-purple-400 rounded-full animate-wave-5" />
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="relative w-full h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/[0.05]">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${((verificationStage + 1) / stages.length) * 100}%` }}
          />
        </div>

        {/* Step-by-Step Stage Flow */}
        <div className="space-y-2.5">
          {stages.map((st, index) => {
            const Icon = st.icon;
            const isCompleted = verificationStage > index;
            const isCurrent = verificationStage === index;

            return (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                  isCurrent
                    ? "bg-white/[0.08] border-indigo-500/40 text-white shadow-lg shadow-indigo-500/10"
                    : isCompleted
                    ? "bg-white/[0.02] border-white/[0.04] text-slate-400"
                    : "opacity-30 border-transparent text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isCurrent
                        ? "bg-indigo-500 text-white font-bold animate-pulse"
                        : "bg-white/[0.04] text-slate-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className="text-xs font-medium block">{st.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{st.detail}</span>
                  </div>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 animate-pulse">
                    PROCESSING...
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    DONE
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
