import React, { useState, useRef, useEffect } from "react";
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
  RefreshCw,
  Clock,
  Share2,
  Sparkles,
  Check,
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────────── */

const serif = { fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" };

const VERDICT_STYLES = {
  VERIFIED:           { accent: "#10b981", bg: "bg-emerald-600",  text: "text-emerald-400",border: "border-emerald-700/40",Icon: ShieldCheck,   label: "Verified",           note: "This claim is fully verified and supported by institutional evidence." },
  TRUE:               { accent: "#16a34a", bg: "bg-emerald-600",  text: "text-emerald-400",border: "border-emerald-700/40",Icon: CheckCircle2,  label: "Verified (True)",    note: "This claim is supported by authoritative evidence." },
  "MOSTLY TRUE":      { accent: "#059669", bg: "bg-emerald-600",  text: "text-emerald-400",border: "border-emerald-700/40",Icon: CheckCircle2,  label: "Mostly True",        note: "The core claim checks out; minor details are unconfirmed." },
  "PARTIALLY TRUE":   { accent: "#d97706", bg: "bg-amber-600",    text: "text-amber-400",  border: "border-amber-700/40", Icon: AlertTriangle,  label: "Partially True",     note: "Some elements are accurate, but the overall picture is incomplete." },
  "PARTLY TRUE":      { accent: "#d97706", bg: "bg-amber-600",    text: "text-amber-400",  border: "border-amber-700/40", Icon: AlertTriangle,  label: "Partially True",     note: "Some elements are accurate, but the overall picture is incomplete or misleading." },
  MISLEADING:         { accent: "#ea580c", bg: "bg-orange-600",   text: "text-orange-400", border: "border-orange-700/40",Icon: AlertTriangle,  label: "Misleading",         note: "The claim uses real facts in a misleading way or lacks critical context." },
  FALSE:              { accent: "#dc2626", bg: "bg-red-600",      text: "text-red-400",    border: "border-red-700/40",   Icon: XCircle,        label: "False",              note: "This claim is contradicted by the available evidence." },
  SATIRE:             { accent: "#7c3aed", bg: "bg-violet-600",   text: "text-violet-400", border: "border-violet-700/40",Icon: Sparkles,       label: "Satire",             note: "This originates from a satirical or parody source." },
  UNVERIFIED:         { accent: "#64748b", bg: "bg-slate-600",    text: "text-slate-400",  border: "border-slate-600/40", Icon: HelpCircle,     label: "Insufficient Evidence", note: "There is not enough evidence to confirm or deny this claim." },
  "INSUFFICIENT EVIDENCE": { accent: "#64748b", bg: "bg-slate-600", text: "text-slate-400", border: "border-slate-600/40", Icon: HelpCircle, label: "Insufficient Evidence", note: "We could not find adequate sources to assess this claim." },
};

function getVS(verdict) {
  if (!verdict) return VERDICT_STYLES.UNVERIFIED;
  const upper = verdict.toUpperCase().trim();
  return VERDICT_STYLES[upper] || VERDICT_STYLES.UNVERIFIED;
}

/* ── tiny sub-components ─────────────────────────────────── */

function SectionHeading({ children }) {
  return (
    <h2
      className="text-base sm:text-lg font-bold text-slate-900 dark:text-white pb-2.5 mb-4 border-b border-slate-200/80 dark:border-white/[0.07] tracking-tight font-sans"
    >
      {children}
    </h2>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm dark:shadow-none ${className}`}>
      {children}
    </div>
  );
}

function MetricRow({ label, value, barPct, barColor = "bg-slate-500" }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-medium tabular-nums">{value}</span>
      </div>
      <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

function EvidenceCard({ item, accentClass, stanceLabel }) {
  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between gap-3 hover-lift transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs text-slate-400 truncate max-w-[200px]">
            {item.source_name || "Source"}
          </span>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${accentClass}`}>
            {stanceLabel}
          </span>
        </div>
        <h3 className="text-sm font-medium text-slate-100 leading-snug line-clamp-2">
          {item.title || "Untitled source"}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
          {item.evidence_text || item.snippet || "No excerpt available."}
        </p>
      </div>
      <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-500">
        <span>Reliability: <strong className="text-slate-300">{item.reliability_score || 85}%</strong></span>
        {item.source_url && (
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors group"
          >
            <span>View source</span>
            <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        )}
      </div>
    </Card>
  );
}

/* ── main component ──────────────────────────────────────── */

export function FactCheckResult() {
  const { verificationResult, setVerificationResult, t, showToast, language } = useApp();
  const [copied, setCopied] = useState(false);
  const [showSocialCardModal, setShowSocialCardModal] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    if (verificationResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [verificationResult?.id]);

  if (!verificationResult) return null;

  const res = verificationResult;
  const vs = getVS(res.verdict);

  const supportingItems = res.supporting_evidence || [];
  const contradictingItems = res.contradictory_evidence || [];
  const totalSourcesCount = supportingItems.length + contradictingItems.length;

  const allEvidence = [...supportingItems, ...contradictingItems];
  const avgSourceCredibility = allEvidence.length > 0
    ? Math.round(allEvidence.reduce((acc, curr) => acc + (curr.reliability_score || 85), 0) / allEvidence.length)
    : Math.round(res.confidence || 85);

  const strengthMap = { "VERY STRONG": 95, "STRONG": 85, "MODERATE": 70, "WEAK": 50, "NONE": 20 };
  const primaryEvidenceScore = strengthMap[res.evidence_strength?.toUpperCase()] || Math.round(res.confidence || 80);

  const sourceAgreementScore = totalSourcesCount > 0
    ? res.verdict === "FALSE" || res.verdict === "MISLEADING"
      ? Math.round((contradictingItems.length / totalSourcesCount) * 100)
      : Math.round((supportingItems.length / totalSourcesCount) * 100)
    : Math.round(res.confidence || 80);

  const claimConsistencyScore = Math.round(res.confidence || 85);

  // Claims list
  const detectedClaimsList = [];
  if (res.extracted_claims && res.extracted_claims.length > 0) {
    res.extracted_claims.forEach((c) => {
      if (c.claim_text) detectedClaimsList.push(c.claim_text);
    });
  }
  if (detectedClaimsList.length === 0 && res.primary_claim) {
    detectedClaimsList.push(res.primary_claim);
  }
  if (detectedClaimsList.length === 1 && res.primary_claim.includes(". ")) {
    const parts = res.primary_claim.split(". ").map(p => p.trim()).filter(p => p.length > 10);
    if (parts.length > 1) {
      detectedClaimsList.length = 0;
      parts.forEach(p => detectedClaimsList.push(p.endsWith(".") ? p : p + "."));
    }
  }

  // Sources list
  const sourceIntelligenceMap = new Map();
  allEvidence.forEach((item) => {
    const name = item.source_name || "Source";
    if (!sourceIntelligenceMap.has(name)) {
      sourceIntelligenceMap.set(name, {
        name,
        url: item.source_url,
        reliability: item.reliability_score || 85,
        type: item.source_type || "news",
        label: item.reliability_label || "Reference",
        stance: item.stance || "SUPPORTS"
      });
    }
  });
  const sourceIntelligenceList = Array.from(sourceIntelligenceMap.values());

  const copyReport = () => {
    const reportText = `TruthLens Fact-Check Report\nVerdict: ${res.verdict}\nConfidence: ${res.confidence}%\nEvidence Strength: ${res.evidence_strength}\nClaim: "${res.primary_claim}"\nAnalysis: ${res.ai_explanation}\nSources checked: ${totalSourcesCount}\nDate: ${res.created_at || new Date().toISOString()}`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    showToast("Report copied to clipboard.");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleVerifyAgain = () => {
    setVerificationResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const verdictBarColor = vs.bg.replace("bg-", "bg-");

  return (
    <div ref={resultRef} className="w-full max-w-3xl mx-auto px-4 sm:px-6 my-10 space-y-6 animate-result-reveal">

      {/* ── 1. VERDICT HEADER ──────────────────────────────── */}
      <div className="space-y-5">
        {/* Top bar: label + actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-500 font-medium">Fact-Check Report</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500 tabular-nums font-mono">{res.id?.slice(0, 12) || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleVerifyAgain}
              className="btn-press px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New check
            </button>
            <button
              onClick={() => setShowSocialCardModal(true)}
              className="btn-press px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          </div>
        </div>

        {/* Verdict banner with subtle glow and smooth icon scale */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${vs.bg} flex items-center justify-center shrink-0 shadow-lg shadow-black/10 transition-transform duration-300 hover:scale-105 relative overflow-hidden`}
            >
              <vs.Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-soft-pulse" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight font-sans tracking-tight"
              >
                {vs.label}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 max-w-lg leading-snug">{vs.note}</p>
            </div>
          </div>

          {/* Claim quoted */}
          <blockquote className="pl-4 border-l-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed italic">
            "{res.primary_claim}"
          </blockquote>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {res.category && <span>{res.category}</span>}
            {res.location && res.location !== "Global" && <span>· {res.location}</span>}
            {res.processing_time_ms && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" />
                {res.processing_time_ms}ms
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. KEY METRICS ─────────────────────────────────── */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{Math.round(res.confidence)}%</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Confidence</div>
          </div>
          <div>
            <div className={`text-lg sm:text-xl font-bold ${vs.text} capitalize`}>{(res.evidence_strength || "None").toLowerCase()}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Evidence</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{totalSourcesCount}</div>
            <div className="text-xs text-slate-500 mt-1 font-medium">Sources</div>
          </div>
        </div>
      </Card>

      {/* ── 3. DETAILED BREAKDOWN ──────────────────────────── */}
      <Card className="p-5 sm:p-6 space-y-5">
        <SectionHeading>Verification breakdown</SectionHeading>
        <div className="space-y-4">
          <MetricRow
            label="Source credibility"
            value={`${avgSourceCredibility}%`}
            barPct={avgSourceCredibility}
            barColor={verdictBarColor}
          />
          <MetricRow
            label="Evidence strength"
            value={`${primaryEvidenceScore}%`}
            barPct={primaryEvidenceScore}
            barColor={verdictBarColor}
          />
          <MetricRow
            label="Cross-source agreement"
            value={`${sourceAgreementScore}%`}
            barPct={sourceAgreementScore}
            barColor={verdictBarColor}
          />
          <MetricRow
            label="Claim consistency"
            value={`${claimConsistencyScore}%`}
            barPct={claimConsistencyScore}
            barColor={verdictBarColor}
          />
        </div>
      </Card>

      {/* ── 4. CLAIMS ──────────────────────────────────────── */}
      {detectedClaimsList.length > 0 && (
        <Card className="p-5 sm:p-6 space-y-4">
          <SectionHeading>Claims identified</SectionHeading>
          <ol className="space-y-3 list-none">
            {detectedClaimsList.map((claimText, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-xs text-slate-500 font-medium tabular-nums pt-0.5 shrink-0">{idx + 1}.</span>
                <div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {claimText}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span>{res.category || "General"}</span>
                    {res.entities?.[0] && (
                      <>
                        <span>·</span>
                        <span>{res.entities[0]}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ── 5. SUPPORTING EVIDENCE ─────────────────────────── */}
      <div className="space-y-4">
        <SectionHeading>
          Supporting evidence
          <span className="text-sm font-normal text-slate-500 ml-2">({supportingItems.length})</span>
        </SectionHeading>

        {supportingItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {supportingItems.map((item, idx) => (
              <EvidenceCard
                key={idx}
                item={item}
                accentClass="bg-green-900/40 text-green-400"
                stanceLabel={item.stance === "CONTEXT" ? "Context" : "Supports"}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-2">No supporting sources were found for this claim.</p>
        )}
      </div>

      {/* ── 6. CONTRADICTING EVIDENCE ──────────────────────── */}
      <div className="space-y-4">
        <SectionHeading>
          Contradicting evidence
          <span className="text-sm font-normal text-slate-500 ml-2">({contradictingItems.length})</span>
        </SectionHeading>

        {contradictingItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contradictingItems.map((item, idx) => (
              <EvidenceCard
                key={idx}
                item={item}
                accentClass="bg-red-900/40 text-red-400"
                stanceLabel="Contradicts"
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-2">No contradicting sources were found.</p>
        )}
      </div>

      {/* ── 7. SOURCES ─────────────────────────────────────── */}
      {sourceIntelligenceList.length > 0 && (
        <Card className="p-5 sm:p-6 space-y-4">
          <SectionHeading>Sources referenced</SectionHeading>
          <div className="divide-y divide-white/[0.05]">
            {sourceIntelligenceList.map((src, idx) => (
              <div key={idx} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-slate-200 truncate">{src.name}</span>
                  <span className="text-[10px] text-slate-600 uppercase shrink-0">{src.type}</span>
                </div>
                <span className="text-sm text-slate-400 tabular-nums shrink-0">{src.reliability}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── 8. ANALYSIS ────────────────────────────────────── */}
      <Card className="p-5 sm:p-6 space-y-4">
        <SectionHeading>Analysis</SectionHeading>

        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {res.ai_explanation}
        </p>

        {res.contextual_notes && (
          <div className="mt-3 pl-4 border-l-2 border-slate-700/60 text-xs text-slate-500 leading-relaxed">
            {res.contextual_notes}
          </div>
        )}
      </Card>

      {/* ── 9. FOOTER ACTIONS ──────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2 pb-4">
        <span className="text-xs text-slate-600">
          Checked {res.created_at ? new Date(res.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "today"}
          {totalSourcesCount > 0 && ` · ${totalSourcesCount} source${totalSourcesCount > 1 ? "s" : ""}`}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={copyReport}
            className="px-3 py-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-400 hover:text-white border border-white/[0.08] flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy report"}
          </button>

          <button
            onClick={handleVerifyAgain}
            className={`px-4 py-1.5 rounded-md ${vs.bg} hover:brightness-110 text-white text-xs font-medium flex items-center gap-1.5 transition-all`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check another claim
          </button>
        </div>
      </div>

      {/* ── Spread graph ──────────────────────────────────── */}
      <div className="pt-2">
        <DisinformationSpreadGraph claim={res.primary_claim} verdict={res.verdict} />
      </div>

      {/* ── Share modal ───────────────────────────────────── */}
      {showSocialCardModal && (
        <SocialFactCardModal
          result={res}
          onClose={() => setShowSocialCardModal(false)}
        />
      )}

    </div>
  );
}
