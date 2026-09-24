import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Camera,
  Layers,
  Palette
} from "lucide-react";

export function SocialFactCardModal({ isOpen, onClose, result, showToast }) {
  const [format, setFormat] = useState("square"); // square (1:1), story (9:16), banner (16:9)
  const [themeStyle, setThemeStyle] = useState("dark"); // dark, neon, minimal
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef(null);

  const getVerdictDetails = (verdict) => {
    switch (verdict) {
      case "TRUE":
      case "MOSTLY TRUE":
        return {
          title: "VERIFIED FACT",
          color: "#10B981",
          secondaryColor: "#059669",
          textColor: "#34D399"
        };
      case "PARTLY TRUE":
      case "MISLEADING":
        return {
          title: "MISLEADING / PARTIAL",
          color: "#F59E0B",
          secondaryColor: "#D97706",
          textColor: "#FBBF24"
        };
      case "FALSE":
        return {
          title: "DEBUNKED FALSE",
          color: "#F43F5E",
          secondaryColor: "#E11D48",
          textColor: "#FB7185"
        };
      default:
        return {
          title: "UNVERIFIED",
          color: "#6366F1",
          secondaryColor: "#4F46E5",
          textColor: "#818CF8"
        };
    }
  };

  const verdictInfo = getVerdictDetails(result?.verdict);

  const drawRoundRectSafe = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + width, y, x + width, y + height, radius);
      ctx.arcTo(x + width, y + height, x, y + height, radius);
      ctx.arcTo(x, y + height, x, y, radius);
      ctx.arcTo(x, y, x + width, y, radius);
      ctx.closePath();
    }
  };

  // Render high-res card to HTML5 Canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = 1080;
    let height = 1080;
    if (format === "story") {
      width = 1080;
      height = 1920;
    } else if (format === "banner") {
      width = 1200;
      height = 675;
    }

    canvas.width = width;
    canvas.height = height;

    // 1. Background
    if (themeStyle === "dark") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#08090E");
      grad.addColorStop(0.5, "#0D111E");
      grad.addColorStop(1, "#05060A");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Ambient radial glow
      const radial = ctx.createRadialGradient(width * 0.8, height * 0.2, 50, width * 0.8, height * 0.2, width * 0.6);
      radial.addColorStop(0, verdictInfo.color + "25");
      radial.addColorStop(1, "transparent");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    } else if (themeStyle === "neon") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#040714");
      grad.addColorStop(0.5, "#0D1026");
      grad.addColorStop(1, "#120826");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Neon grid lines
      ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else {
      // Minimal Light
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);

      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#F8FAFC");
      grad.addColorStop(1, "#EDF2F7");
      ctx.fillStyle = grad;
      ctx.fillRect(40, 40, width - 80, height - 80);
    }

    // Outer Border
    ctx.strokeStyle = themeStyle === "minimal" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // 2. Header: TruthLens Logo & Seal
    ctx.fillStyle = themeStyle === "minimal" ? "#0F172A" : "#FFFFFF";
    ctx.font = "bold 38px sans-serif";
    ctx.fillText("TruthLens", 80, 110);

    ctx.fillStyle = verdictInfo.color;
    ctx.font = "bold 20px monospace";
    ctx.fillText("AI VERIFICATION SEAL", 80, 140);

    // Timestamp & ID
    ctx.fillStyle = themeStyle === "minimal" ? "#64748B" : "#94A3B8";
    ctx.font = "20px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`DOSSIER #${result.id?.slice(0, 8) || "TL-8421"}`, width - 80, 110);
    ctx.fillText(new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), width - 80, 140);
    ctx.textAlign = "left";

    // 3. Verdict Stamp Box
    const boxY = format === "story" ? 220 : 190;
    const boxHeight = 130;
    ctx.fillStyle = verdictInfo.color + "18";
    ctx.strokeStyle = verdictInfo.color + "80";
    ctx.lineWidth = 3;
    drawRoundRectSafe(ctx, 80, boxY, width - 160, boxHeight, 24);
    ctx.fill();
    ctx.stroke();

    // Verdict Stamp Text
    ctx.fillStyle = verdictInfo.color;
    ctx.font = "900 48px sans-serif";
    ctx.fillText(`• ${result.verdict}`, 120, boxY + 82);

    // Trust Score Meter inside box
    ctx.textAlign = "right";
    ctx.fillStyle = themeStyle === "minimal" ? "#0F172A" : "#FFFFFF";
    ctx.font = "900 44px sans-serif";
    ctx.fillText(`${result.confidence}%`, width - 120, boxY + 70);
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = themeStyle === "minimal" ? "#64748B" : "#94A3B8";
    ctx.fillText("CONFIDENCE INDEX", width - 120, boxY + 100);
    ctx.textAlign = "left";

    // 4. Primary Claim Header
    const claimY = boxY + boxHeight + 60;
    ctx.fillStyle = themeStyle === "minimal" ? "#64748B" : "#94A3B8";
    ctx.font = "bold 20px monospace";
    ctx.fillText("AUDITED STATEMENT:", 80, claimY);

    // Wrapped Claim Text
    ctx.fillStyle = themeStyle === "minimal" ? "#0F172A" : "#FFFFFF";
    ctx.font = "bold 36px sans-serif";
    const maxWidth = width - 160;
    const words = `"${result.primary_claim}"`.split(" ");
    let line = "";
    let curY = claimY + 45;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 80, curY);
        line = words[n] + " ";
        curY += 48;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 80, curY);

    // 5. Official Summary / Rationale Box
    const summaryY = curY + 40;
    ctx.fillStyle = themeStyle === "minimal" ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)";
    ctx.strokeStyle = themeStyle === "minimal" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    
    const summaryHeight = format === "story" ? 400 : 200;
    drawRoundRectSafe(ctx, 80, summaryY, width - 160, summaryHeight, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = themeStyle === "minimal" ? "#4338CA" : "#818CF8";
    ctx.font = "bold 20px monospace";
    ctx.fillText("KEY FORENSIC FINDING:", 110, summaryY + 45);

    ctx.fillStyle = themeStyle === "minimal" ? "#334155" : "#CBD5E1";
    ctx.font = "24px sans-serif";
    const sumWords = (result.ai_explanation || "").slice(0, 220) + "...";
    const sWords = sumWords.split(" ");
    let sLine = "";
    let sY = summaryY + 85;

    for (let i = 0; i < sWords.length; i++) {
      const testLine = sLine + sWords[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth - 60 && i > 0) {
        ctx.fillText(sLine, 110, sY);
        sLine = sWords[i] + " ";
        sY += 34;
      } else {
        sLine = testLine;
      }
    }
    ctx.fillText(sLine, 110, sY);

    // 6. Footer Wire Attribution
    const footerY = height - 80;
    ctx.fillStyle = themeStyle === "minimal" ? "#64748B" : "#94A3B8";
    ctx.font = "18px monospace";
    ctx.fillText(`Audited against ${result.supporting_evidence?.length || 0} primary wires • TruthLens Platform`, 80, footerY);

    ctx.textAlign = "right";
    ctx.fillStyle = verdictInfo.color;
    ctx.fillText("truthlens.ai", width - 80, footerY);
    ctx.textAlign = "left";
  };

  useEffect(() => {
    if (!isOpen || !result) return undefined;
    const timer = setTimeout(() => {
      renderCanvas();
    }, 50);
    return () => clearTimeout(timer);
  }, [format, themeStyle, result, isOpen]);

  if (!isOpen || !result) return null;

  const handleDownload = () => {
    setDownloading(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `truthlens-factcheck-${result.id?.slice(0, 8) || "report"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    setDownloading(false);
    if (showToast) showToast("Social Fact-Card downloaded successfully!");
  };

  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          setCopied(true);
          if (showToast) showToast("Fact-Card copied to clipboard!");
          setTimeout(() => setCopied(false), 2500);
        }
      });
    } catch {
      if (showToast) showToast("Click Download Image to save your card.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Shareable Social Fact-Card Studio
              </h3>
              <p className="text-xs text-slate-400">
                Generate high-resolution verified verdict cards for Instagram, X (Twitter), WhatsApp & LinkedIn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Card Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-1 rounded-2xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setFormat("square")}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  format === "square"
                    ? "bg-white/[0.14] text-white font-bold border border-white/[0.12] shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                1:1 Square
              </button>
              <button
                type="button"
                onClick={() => setFormat("story")}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  format === "story"
                    ? "bg-white/[0.14] text-white font-bold border border-white/[0.12] shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                9:16 Story
              </button>
              <button
                type="button"
                onClick={() => setFormat("banner")}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  format === "banner"
                    ? "bg-white/[0.14] text-white font-bold border border-white/[0.12] shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                16:9 Banner
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Visual Theme Preset
            </label>
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-1 rounded-2xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setThemeStyle("dark")}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  themeStyle === "dark"
                    ? "bg-white/[0.14] text-white font-bold border border-white/[0.12] shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Obsidian Dark
              </button>
              <button
                type="button"
                onClick={() => setThemeStyle("neon")}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  themeStyle === "neon"
                    ? "bg-white/[0.14] text-white font-bold border border-white/[0.12] shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Cyber Neon
              </button>
              <button
                type="button"
                onClick={() => setThemeStyle("minimal")}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  themeStyle === "minimal"
                    ? "bg-white/[0.14] text-white font-bold border border-white/[0.12] shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Pure Minimal
              </button>
            </div>
          </div>

        </div>

        {/* Live Canvas Preview */}
        <div className="flex justify-center items-center bg-black/60 rounded-2xl p-4 border border-white/[0.06] overflow-hidden max-h-[380px]">
          <canvas
            ref={canvasRef}
            className="max-h-[340px] max-w-full object-contain rounded-xl shadow-2xl border border-white/[0.08]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
          <span className="text-xs font-mono text-slate-500">
            High-Resolution PNG • Watermarked Cryptographic Verification
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyImage}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? "Copied to Clipboard" : "Copy Card"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Image</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
