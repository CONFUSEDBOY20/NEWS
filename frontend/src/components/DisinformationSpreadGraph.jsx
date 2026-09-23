import React, { useState } from "react";
import {
  Globe,
  Radio,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Info,
  Layers,
  ArrowRight,
  ExternalLink,
  Activity,
  CheckCircle2,
  XCircle,
  Zap,
  Filter,
  X
} from "lucide-react";

export function DisinformationSpreadGraph({ result }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, origins, amplifiers, debunker

  if (!result) return null;

  // Build network nodes based on result data
  const isFalseOrMisleading = ["FALSE", "MISLEADING", "PARTLY TRUE"].includes(result.verdict);

  const nodes = [
    {
      id: "claim",
      label: "Subject Claim",
      subtitle: (result.primary_claim || "").slice(0, 32) + "...",
      type: "target",
      verdict: result.verdict,
      x: 350,
      y: 190,
      radius: 34,
      color: isFalseOrMisleading ? "#F43F5E" : "#10B981",
      reliability: `${result.confidence}% Trust Index`,
      domain: "Audited Claim Subject",
      excerpt: result.primary_claim,
      role: "Central Verification Subject"
    },
    // Rumor Origin
    {
      id: "origin-1",
      label: isFalseOrMisleading ? "Anon Social Channel" : "Scientific Journal Dispatch",
      subtitle: "First spotted index",
      type: "origin",
      x: 100,
      y: 90,
      radius: 25,
      color: isFalseOrMisleading ? "#EF4444" : "#3B82F6",
      reliability: isFalseOrMisleading ? "18% Low Trust" : "96% High Trust",
      domain: isFalseOrMisleading ? "t.me/viral_unverified" : "nature.com/articles",
      excerpt: isFalseOrMisleading
        ? "Sensationalist unverified assertion without primary documentation."
        : "Peer-reviewed publication on verified experimental trials.",
      role: "Initial Rumor / Claim Genesis"
    },
    // Amplifiers
    {
      id: "amp-1",
      label: "Viral Aggregator Botnet",
      subtitle: "3.2M Impressions",
      type: "amplifier",
      x: 190,
      y: 290,
      radius: 23,
      color: "#F59E0B",
      reliability: "32% Unverified",
      domain: "clickwire-news.net",
      excerpt: "Auto-reposted across 42 viral syndicated aggregator channels within 3 hours.",
      role: "Amplification Node"
    },
    {
      id: "amp-2",
      label: "Sensationalist Portal",
      subtitle: "1.4M Shares",
      type: "amplifier",
      x: 290,
      y: 65,
      radius: 22,
      color: "#F97316",
      reliability: "28% Unverified",
      domain: "breaking-headline24.com",
      excerpt: "Clickbait headline generated without editorial cross-examination.",
      role: "Amplification Node"
    },
    // Audited Wires / Debunkers
    {
      id: "debunk-1",
      label: result.supporting_evidence?.[0]?.source || "Reuters Fact Check",
      subtitle: "Official Wire Audit",
      type: "debunker",
      x: 580,
      y: 110,
      radius: 28,
      color: "#10B981",
      reliability: "99% High Trust",
      domain: result.supporting_evidence?.[0]?.source || "reuters.com",
      excerpt: result.supporting_evidence?.[0]?.snippet || "Official verified dispatch confirming factual records.",
      role: "Primary Corroborating Wire"
    },
    {
      id: "debunk-2",
      label: result.supporting_evidence?.[1]?.source || "PIB Fact Bureau",
      subtitle: "Official Agency Gazette",
      type: "debunker",
      x: 570,
      y: 270,
      radius: 26,
      color: "#06B6D4",
      reliability: "98% High Trust",
      domain: "factcheck.pib.gov.in",
      excerpt: result.supporting_evidence?.[1]?.snippet || "Official verification audit released to national wire.",
      role: "Primary Wire Repository"
    }
  ];

  // Links connecting the nodes
  const links = [
    { from: "origin-1", to: "amp-1", animated: true },
    { from: "origin-1", to: "amp-2", animated: true },
    { from: "amp-1", to: "claim", animated: true },
    { from: "amp-2", to: "claim", animated: true },
    { from: "claim", to: "debunk-1", animated: true },
    { from: "claim", to: "debunk-2", animated: true }
  ];

  const visibleNodes = nodes.filter(n => {
    if (filterType === "all") return true;
    if (filterType === "origins" && (n.type === "origin" || n.type === "target")) return true;
    if (filterType === "amplifiers" && (n.type === "amplifier" || n.type === "target")) return true;
    if (filterType === "debunker" && (n.type === "debunker" || n.type === "target")) return true;
    return true;
  });

  const getNode = (id) => nodes.find(n => n.id === id);

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/[0.08] space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Disinformation Spread & Wire Consensus Graph
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Propagation trajectory from unverified genesis to audited wire verification
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06] text-xs">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterType === "all" ? "bg-white/[0.12] text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            All Nodes
          </button>
          <button
            type="button"
            onClick={() => setFilterType("origins")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterType === "origins" ? "bg-white/[0.12] text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Origins
          </button>
          <button
            type="button"
            onClick={() => setFilterType("amplifiers")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterType === "amplifiers" ? "bg-white/[0.12] text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Amplifiers
          </button>
          <button
            type="button"
            onClick={() => setFilterType("debunker")}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              filterType === "debunker" ? "bg-white/[0.12] text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            Audited Wires
          </button>
        </div>
      </div>

      {/* SVG Canvas Graph Area */}
      <div className="relative w-full h-[380px] bg-black/50 rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center">
        
        {/* Ambient Grid Pattern */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#6366F1_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <svg className="w-full h-full" viewBox="0 0 700 380">
          <defs>
            <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Links */}
          {links.map((link, idx) => {
            const from = getNode(link.from);
            const to = getNode(link.to);
            if (!from || !to) return null;

            return (
              <g key={idx}>
                {/* Static Link Line */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
                {/* Flow Animation Line */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="url(#linkGrad)"
                  strokeWidth="2.5"
                  strokeDasharray="6 8"
                  className="animate-pulse"
                />
              </g>
            );
          })}

          {/* Nodes */}
          {visibleNodes.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer group"
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* Node Outer Ring */}
                <circle
                  r={node.radius + 8}
                  fill={node.color}
                  opacity={isSelected ? "0.45" : "0.15"}
                  className="group-hover:opacity-50 transition-opacity"
                />
                {/* Node Circle */}
                <circle
                  r={node.radius}
                  fill="#0D101A"
                  stroke={node.color}
                  strokeWidth={isSelected ? "3.5" : "2"}
                  className="group-hover:scale-105 transition-transform"
                />
                {/* Center dot / emblem */}
                <circle
                  r={node.radius * 0.35}
                  fill={node.color}
                  className="animate-pulse"
                />
                {/* Label */}
                <text
                  y={node.radius + 18}
                  textAnchor="middle"
                  fill="#F8FAFC"
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  className="select-none pointer-events-none"
                >
                  {node.label}
                </text>
                <text
                  y={node.radius + 31}
                  textAnchor="middle"
                  fill="#94A3B8"
                  fontSize="9"
                  fontFamily="monospace"
                  className="select-none pointer-events-none"
                >
                  {node.subtitle}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/[0.08] flex items-center gap-3 text-[10px] font-mono text-slate-400 select-none">
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Origin
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Amplifier
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Audited Wire
          </span>
        </div>

        {/* Click hint if no node selected */}
        {!selectedNode && (
          <div className="absolute top-3 right-3 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-[10px] font-mono text-indigo-300 pointer-events-none">
            Click any node to inspect details 🔍
          </div>
        )}

      </div>

      {/* Interactive Selected Node Inspector Drawer */}
      {selectedNode && (
        <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: selectedNode.color }}
              />
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {selectedNode.label} ({selectedNode.role})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-indigo-300 border border-white/[0.08]">
                {selectedNode.reliability}
              </span>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono">
            <div>
              <span className="text-slate-500">Domain / Handle: </span>
              <span className="text-slate-200">{selectedNode.domain}</span>
            </div>
            <div>
              <span className="text-slate-500">Classification: </span>
              <span className="text-indigo-400 font-bold uppercase">{selectedNode.type}</span>
            </div>
          </div>

          <p className="text-xs text-slate-300 italic pt-1 border-t border-white/[0.06]">
            "{selectedNode.excerpt}"
          </p>
        </div>
      )}

    </div>
  );
}
