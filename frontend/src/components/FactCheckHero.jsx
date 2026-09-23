import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Link2,
  FileText,
  ImageIcon,
  Sparkles,
  ArrowRight,
  UploadCloud,
  X,
  AlertCircle,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Command,
  CornerDownLeft,
  Activity,
  Cpu,
  Layers,
  Zap
} from "lucide-react";

export function FactCheckHero() {
  const {
    t,
    language,
    inputPreload,
    setInputPreload,
    setIsVerifying,
    setVerificationStage,
    setVerificationResult,
    addToHistory,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState("text"); // default to text for immediate search feel
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const consoleRef = useRef(null);

  useEffect(() => {
    if (inputPreload) {
      if (inputPreload.type === "url") {
        setActiveTab("url");
        setUrlInput(inputPreload.value);
      } else if (inputPreload.type === "text") {
        setActiveTab("text");
        setTextInput(inputPreload.value);
      }
      setInputPreload(null);
    }
  }, [inputPreload]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setError("Image exceeds maximum 15MB limit.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const triggerFlashEffect = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 900);
  };

  const simulateProgress = async () => {
    setIsVerifying(true);
    setError(null);
    setVerificationResult(null);
    for (let i = 0; i < 7; i++) {
      setVerificationStage(i);
      await new Promise((r) => setTimeout(r, 380));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);

    // Validation
    if (activeTab === "url" && (!urlInput.trim() || !urlInput.trim().startsWith("http"))) {
      setError("Please provide a valid news URL starting with http:// or https://");
      return;
    }
    if (activeTab === "text" && (!textInput.trim() || textInput.trim().length < 5)) {
      setError("Please enter at least 5 characters of claim text to verify.");
      return;
    }
    if (activeTab === "image" && !imageFile) {
      setError("Please select or drop an image file to verify.");
      return;
    }

    // Trigger instant Flash Animation
    triggerFlashEffect();

    try {
      if (activeTab === "url") {
        await simulateProgress();
        const result = await api.verifyUrl(urlInput.trim(), language);
        setVerificationStage(7);
        setTimeout(() => {
          setIsVerifying(false);
          setVerificationResult(result);
          addToHistory(result);
          showToast(t.savedToHistory);
        }, 400);
      } else if (activeTab === "text") {
        await simulateProgress();
        const result = await api.verifyText(textInput.trim(), language);
        setVerificationStage(7);
        setTimeout(() => {
          setIsVerifying(false);
          setVerificationResult(result);
          addToHistory(result);
          showToast(t.savedToHistory);
        }, 400);
      } else if (activeTab === "image") {
        await simulateProgress();
        const result = await api.verifyImage(imageFile, language);
        setVerificationStage(7);
        setTimeout(() => {
          setIsVerifying(false);
          setVerificationResult(result);
          addToHistory(result);
          showToast(t.savedToHistory);
        }, 400);
      }
    } catch (err) {
      setIsVerifying(false);
      setError(err.message || "Verification request failed. Please check connection and retry.");
    }
  };

  const sampleChips = [
    { label: "WHO Health Treaty", text: "WHO announced mandatory global digital health passports for all travel in 2026." },
    { label: "RBI ₹500 Note Update", text: "Reserve Bank of India RBI is discontinuing all 500 rupee notes immediately." },
    { label: "ISRO Lunar Prospecting", text: "ISRO launches lunar water prospecting rover with real-time spectrometry." },
    { label: "Deepfake Audio Warning", text: "Election commission issues alert on AI voice cloning scam targeting voters." }
  ];

  return (
    <section className="relative pt-8 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      
      {/* Fullscreen Subtle Ambient Flash Burst */}
      {isFlashing && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center animate-screen-flash">
          <div className="w-full h-full bg-indigo-500/15 backdrop-blur-[2px]" />
          <div className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-r from-cyan-400/30 via-indigo-500/40 to-emerald-400/30 blur-[100px] animate-ping" />
        </div>
      )}

      {/* Hero Badge & Typography */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-indigo-300 backdrop-blur-xl shadow-lg shadow-indigo-500/5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>{language === "hi" ? "एआई-संचालित मीडिया इंटेलिजेंस" : "Evidence-First Media Intelligence"}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-slate-400 font-mono text-[11px]">v2.6</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Verify Anything. <br />
          <span className="bg-gradient-to-r from-indigo-300 via-white to-emerald-300 bg-clip-text text-transparent">
            Trust with Certainty.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto font-normal">
          {language === "hi"
            ? "दावों, समाचार यूआरएल और छवियों का 500+ सत्यापित वैश्विक वायर स्रोतों से सेकंडों में क्रॉस-वेरिफिकेशन करें।"
            : "Cross-examine breaking news, raw claims, and images across 500+ audited wire repositories in milliseconds."}
        </p>
      </div>

      {/* Linear Spotlight Search Console */}
      <div
        ref={consoleRef}
        className={`glass-panel rounded-3xl p-3 sm:p-5 border transition-all duration-500 relative overflow-hidden spotlight-glow ${
          isFlashing
            ? "border-indigo-400 shadow-[0_0_60px_rgba(99,102,241,0.6)] scale-[1.01]"
            : "border-white/[0.08]"
        }`}
      >
        {/* Laser Sweep Scanner Line on Flash */}
        {isFlashing && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-laser pointer-events-none z-20" />
        )}
        
        {/* Subtle top sheen */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />

        {/* Modal Segmented Switcher */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.06] flex-wrap">
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => { setActiveTab("text"); setError(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "text"
                  ? "bg-white/[0.14] text-white font-semibold border border-white/[0.12] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t.tabText}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("url"); setError(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "url"
                  ? "bg-white/[0.14] text-white font-semibold border border-white/[0.12] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.tabUrl}</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab("image"); setError(null); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "image"
                  ? "bg-white/[0.14] text-white font-semibold border border-white/[0.12] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.tabImage}</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>FactDB Online</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span>Gemini 2.5 Flash</span>
            </span>
          </div>
        </div>

        {/* Dynamic Form Area */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* TAB 1: Claim / Text Verification */}
          {activeTab === "text" && (
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  rows={3}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t.textPlaceholder}
                  className="w-full bg-black/40 text-slate-100 text-sm rounded-2xl px-4 py-3.5 border border-white/[0.08] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-500 resize-none font-normal"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSubmit(e);
                    }
                  }}
                />
                {textInput && (
                  <button
                    type="button"
                    onClick={() => setTextInput("")}
                    className="absolute top-3.5 right-3.5 text-slate-500 hover:text-slate-300 p-1 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: News URL Verification */}
          {activeTab === "url" && (
            <div className="relative flex items-center">
              <Link2 className="absolute left-4 w-4 h-4 text-emerald-400 pointer-events-none" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t.urlPlaceholder}
                className="w-full bg-black/40 text-slate-100 text-sm rounded-2xl pl-11 pr-24 py-3.5 border border-white/[0.08] focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all placeholder:text-slate-500"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput("")}
                  className="absolute right-20 text-slate-500 hover:text-slate-300 p-1 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* TAB 3: Image Forensics */}
          {activeTab === "image" && (
            <div>
              {!imagePreview ? (
                <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-indigo-500/50 hover:bg-white/[0.02] cursor-pointer transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-200">{t.dropImage}</span>
                  <span className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP up to 15MB • ELA & Metadata Forensics</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] bg-black/50 p-3 flex items-center gap-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-xl border border-white/[0.08]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{imageFile?.name}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {(imageFile?.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        EXIF Engine Armed
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        ELA Grid Ready
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/[0.08] transition-colors mr-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 border border-white/[0.08]">Ctrl + ↵</span>
              <span className="hidden sm:inline">to execute verification</span>
            </div>

            <button
              type="submit"
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl text-white text-xs font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-lg ${
                isFlashing
                  ? "bg-white text-slate-950 scale-105 shadow-[0_0_35px_#ffffff]"
                  : "bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {isFlashing ? (
                <>
                  <Zap className="w-4 h-4 text-indigo-600 animate-bounce" />
                  <span className="text-slate-950">SCANNING WIRE...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.verifyButton}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </>
              )}
            </button>
          </div>

        </form>

        {/* Quick Sample Claim Chips */}
        <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>{language === "hi" ? "त्वरित नमूना दावे:" : "Quick Sample Investigations:"}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sampleChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveTab("text");
                  setTextInput(chip.text);
                  setError(null);
                }}
                className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] hover:border-indigo-500/30 transition-all duration-150 flex items-center gap-1.5"
              >
                <span>{chip.label}</span>
                <span className="text-[10px] text-slate-500">→</span>
              </button>
            ))}
          </div>
        </div>

      </div>

    </section>
  );
}
