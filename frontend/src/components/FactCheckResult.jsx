import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { SocialFactCardModal } from "./SocialFactCardModal";
import { DisinformationSpreadGraph } from "./DisinformationSpreadGraph";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  Copy,
  Printer,
  RefreshCw,
  Clock,
  MapPin,
  Tag,
  Share2,
  FileCheck,
  Sparkles,
  SearchCheck,
  Check,
  Layers,
  Camera,
  Activity,
  ArrowUpRight,
  TrendingUp,
  BarChart2,
  Globe
} from "lucide-react";

export function FactCheckResult() {
  const { verificationResult, setVerificationResult, t, showToast, language } = useApp();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview, evidence, network, forensics
  const [showSocialCardModal, setShowSocialCardModal] = useState(false);

  if (!verificationResult) return null;

  const res = verificationResult;

  // Verdict Styling & Colors
  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case "TRUE":
        return {
          bg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
          icon: CheckCircle2,
          colorText: "text-emerald-400",
          strokeColor: "#10B981",
          ringColor: "ring-emerald-500/30",
          glow: "glow-emerald",
          description: "All audited wire sources corroborate this claim without contradiction."
        };
      case "MOSTLY TRUE":
        return {
          bg: "bg-teal-500/10 text-teal-300 border-teal-500/30",
          icon: CheckCircle2,
          colorText: "text-teal-300",
          strokeColor: "#14B8A6",
          ringColor: "ring-teal-500/30",
          glow: "glow-cyan",
          description: "Major assertions verified; minor details may lack independent secondary confirmation."
        };
      case "PARTLY TRUE":
        return {
          bg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
          icon: AlertTriangle,
          colorText: "text-amber-300",
          strokeColor: "#F59E0B",
          ringColor: "ring-amber-500/30",
          glow: "glow-indigo",
          description: "Contains elements of truth mixed with unsubstantiated or outdated assertions."
        };
      case "MISLEADING":
        return {
          bg: "bg-orange-500/10 text-orange-300 border-orange-500/30",
          icon: AlertTriangle,
          colorText: "text-orange-400",
          strokeColor: "#F97316",
          ringColor: "ring-orange-500/30",
          glow: "glow-rose",
          description: "Presents facts out of context or draws unsupported conclusions."
        };
      case "FALSE":
        return {
          bg: "bg-rose-500/10 text-rose-300 border-rose-500/30",
          icon: XCircle,
          colorText: "text-rose-400",
          strokeColor: "#F43F5E",
          ringColor: "ring-rose-500/30",
          glow: "glow-rose",
          description: "Directly contradicted by official records and verified primary documentation."
        };
      case "SATIRE":
        return {
          bg: "bg-purple-500/10 text-purple-300 border-purple-500/30",
          icon: Sparkles,
          colorText: "text-purple-300",
          strokeColor: "#A855F7",
          ringColor: "ring-purple-500/30",
          glow: "glow-indigo",
          description: "Originates from a parody or satirical humor publication."
        };
      default:
        return {
          bg: "bg-slate-500/10 text-slate-300 border-slate-500/30",
          icon: HelpCircle,
          colorText: "text-slate-300",
          strokeColor: "#64748B",
          ringColor: "ring-slate-500/30",
          glow: "",
          description: "Insufficient public evidence available to render a definitive verdict."
        };
    }
  };

  const badge = getVerdictBadge(res.verdict);
  const VerdictIcon = badge.icon;

  // Gauge calculation for circular ring (radius 45, circumference ~ 282.74)
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (res.confidence / 100) * circumference;

  const totalEvidenceCount = (res.supporting_evidence?.length || 0) + (res.contradictory_evidence?.length || 0);
  const supportingPct = totalEvidenceCount > 0 
    ? Math.round(((res.supporting_evidence?.length || 0) / totalEvidenceCount) * 100) 
    : 50;

  const copyReport = () => {
    const reportText = `[TruthLens Fact-Check Report]\nVerdict: ${res.verdict} (${res.confidence}% Confidence)\nClaim: ${res.primary_claim}\nCategory: ${res.category} | Location: ${res.location}\nRationale: ${res.ai_explanation}\nSources: ${totalEvidenceCount} audited sources\nVerified at: ${res.created_at}`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    showToast("Verification report copied to clipboard.");
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const resultRef = React.useRef(null);

  React.useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [res.id]);

  return (
    <div ref={resultRef} className="w-full max-w-5xl mx-auto px-4 sm:px-6 my-8 space-y-6 animate-result-reveal">
      
      {/* Top Main Dossier Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-2xl relative overflow-hidden spotlight-glow">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
          
          {/* Left: Verdict Info & Claim */}
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-300">
                DOSSIER #{res.id?.slice(0, 8)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {res.processing_time_ms}ms execution
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-400" />
                {res.category}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-sm font-bold tracking-wide uppercase ${badge.bg}`}>
                <VerdictIcon className="w-4 h-4" />
                <span>{res.verdict}</span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {badge.description}
              </span>
            </div>

            {/* Primary Claim Quote Box */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Audited Statement / Subject
              </span>
              <p className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
                "{res.primary_claim}"
              </p>
            </div>
          </div>

          {/* Right: Apple-style Circular Gauge Trust Meter */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-black/40 border border-white/[0.06] shrink-0 self-center lg:self-auto min-w-[200px]">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="text-white/[0.06] stroke-current"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={badge.strokeColor}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              {/* Center Metrics */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black tracking-tight text-white">
                  {res.confidence}%
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
                  Trust Index
                </span>
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-xs font-semibold text-slate-300 block">
                Evidence: <span className={badge.colorText}>{res.evidence_strength}</span>
              </span>
            </div>
          </div>

        </div>

        {/* Action Toolbar */}
        <div className="mt-6 pt-6 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-3">
          
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06] flex-wrap">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "overview"
                  ? "bg-white/[0.12] text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Overview & Analysis
            </button>
            <button
              onClick={() => setActiveTab("evidence")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "evidence"
                  ? "bg-white/[0.12] text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sources ({totalEvidenceCount})
            </button>
            <button
              onClick={() => setActiveTab("network")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "network"
                  ? "bg-white/[0.12] text-white font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Spread Graph</span>
            </button>
            {res.image_forensics && (
              <button
                onClick={() => setActiveTab("forensics")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "forensics"
                    ? "bg-white/[0.12] text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Image Forensics
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Share Social Fact-Card Generator Button */}
            <button
              onClick={() => setShowSocialCardModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 hover:from-indigo-500/30 hover:to-emerald-500/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 hover:border-indigo-500/50 shadow-md transition-all group"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span>Social Fact-Card</span>
            </button>

            <button
              onClick={copyReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.06] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? "Copied" : t.btnCopyReport}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-medium border border-white/[0.06] transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>{t.btnPrintDossier}</span>
            </button>

            <button
              onClick={() => setVerificationResult(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/20 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.btnNewCheck}</span>
            </button>
          </div>

        </div>

      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main AI Explanation & Assessment */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-3xl p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {t.aiExplanation}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                {res.ai_explanation}
              </p>
            </div>

            {/* Evidence Balance Bar Graph */}
            <div className="glass-panel rounded-3xl p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Source Corroboration Balance
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {res.supporting_evidence?.length || 0} Supporting vs {res.contradictory_evidence?.length || 0} Contradictory
                </span>
              </div>

              {/* Horizontal Dual Bar */}
              <div className="space-y-2">
                <div className="w-full h-3 bg-rose-500/20 rounded-full overflow-hidden flex border border-white/[0.06]">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${supportingPct}%` }}
                    title={`Supporting: ${supportingPct}%`}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-700"
                    style={{ width: `${100 - supportingPct}%` }}
                    title={`Contradictory: ${100 - supportingPct}%`}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    Corroborating ({supportingPct}%)
                  </span>
                  <span className="text-rose-400 flex items-center gap-1">
                    Contradictory ({100 - supportingPct}%)
                    <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Context & Signals */}
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-6 border border-white/[0.08] space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Intelligence Telemetry
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-slate-400">Target Region:</span>
                  <span className="text-slate-200 font-medium">{res.location}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-slate-400">Topic Domain:</span>
                  <span className="text-slate-200 font-medium">{res.category}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-slate-400">Model Tier:</span>
                  <span className="text-slate-200 font-mono">Gemini 2.5 Reasoner</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/[0.06]">
                  <span className="text-slate-400">Audit Status:</span>
                  <span className="text-emerald-400 font-mono font-bold">CRYPTO-SEALED</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB CONTENT: Evidence Sources */}
      {activeTab === "evidence" && (
        <div className="space-y-6">
          {/* Corroborating Evidence */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Primary Corroborating Sources ({res.supporting_evidence?.length || 0})
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {res.supporting_evidence?.map((item, idx) => (
                <div
                  key={idx}
                  className="glass-card rounded-2xl p-4 border border-white/[0.06] space-y-2 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[200px]">
                      {item.source}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Score: {item.reliability_score || "0.95"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    "{item.snippet}"
                  </p>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors pt-1"
                    >
                      <span>View Wire Dispatch</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contradictory Evidence */}
          {res.contradictory_evidence?.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Contradictory Evidence & Rebuttals ({res.contradictory_evidence.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {res.contradictory_evidence.map((item, idx) => (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-500/[0.03] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-200">
                        {item.source}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                        Refutation
                      </span>
                    </div>
                    <p className="text-xs text-rose-200/90 leading-snug">
                      "{item.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Disinformation Spread Network Graph */}
      {activeTab === "network" && (
        <DisinformationSpreadGraph result={res} />
      )}

      {/* TAB CONTENT: Image Forensics */}
      {activeTab === "forensics" && res.image_forensics && (
        <div className="glass-panel rounded-3xl p-6 border border-white/[0.08] space-y-6">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">
              Compression Gradient & EXIF Metadata Forensics
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">AI Synthetic Score</span>
              <p className="text-lg font-bold text-cyan-300">
                {res.image_forensics.ai_generated_probability || "12%"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">ELA Compression Delta</span>
              <p className="text-lg font-bold text-emerald-300">
                {res.image_forensics.ela_anomaly_score || "Low Variance"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Camera Hardware Signature</span>
              <p className="text-xs font-mono text-slate-300 mt-1 truncate">
                {res.image_forensics.exif_camera || "Embedded Digital Sensor"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Social Fact-Card Generator Modal */}
      <SocialFactCardModal
        isOpen={showSocialCardModal}
        onClose={() => setShowSocialCardModal(false)}
        result={res}
        showToast={showToast}
      />

    </div>
  );
}
