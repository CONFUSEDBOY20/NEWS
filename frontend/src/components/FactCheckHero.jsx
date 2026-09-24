import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  Link2,
  FileText,
  ImageIcon,
  ShieldCheck,
  Search,
  UploadCloud,
  X,
  AlertCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Radio,
  ExternalLink,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
  ChevronRight,
  Globe2,
  Atom,
  Terminal,
  Activity,
  Briefcase
} from "lucide-react";

function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso.slice(0, 10);
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function FactCheckHero() {
  const {
    t,
    language,
    inputPreload,
    setInputPreload,
    setIsVerifying,
    isVerifying,
    setVerificationStage,
    setVerificationResult,
    addToHistory,
    showToast
  } = useApp();

  // Verification Input States
  const [activeTab, setActiveTab] = useState("text"); // 'url', 'text', 'image'
  const [inputValue, setInputValue] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [inputError, setInputError] = useState(null);
  const fileInputRef = useRef(null);
  const heroRef = useRef(null);

  // Live News State Below Hero
  const [newsCategory, setNewsCategory] = useState("India"); // 'India', 'World', 'Technology', 'Science', 'Health', 'Business'
  const [newsArticles, setNewsArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);

  const categories = [
    { id: "India", label: "India", icon: Globe2 },
    { id: "World", label: "World", icon: Globe2 },
    { id: "Technology", label: "Technology", icon: Terminal },
    { id: "Science", label: "Science", icon: Atom },
    { id: "Health", label: "Health", icon: Activity },
    { id: "Business", label: "Business", icon: Briefcase },
  ];

  // Handle Preloaded inputs from Ticker / News clicks
  useEffect(() => {
    if (!inputPreload) return;
    const { type, value, autoStart } = inputPreload;
    if (type === "url") {
      setActiveTab("url");
      setInputValue(value);
    } else if (type === "text") {
      setActiveTab("text");
      setInputValue(value);
    }
    setInputPreload(null);
    if (autoStart && value) {
      handleVerification(null, { tab: type, value });
    }
  }, [inputPreload]);

  // Fetch Live News for Homepage Section
  useEffect(() => {
    loadLiveNews(true, false);
    const interval = setInterval(() => {
      loadLiveNews(false, false);
    }, 60000);
    return () => clearInterval(interval);
  }, [newsCategory]);

  const loadLiveNews = async (showLoader = false, fresh = false) => {
    if (showLoader) setNewsLoading(true);
    else setNewsRefreshing(true);

    try {
      let data;
      if (newsCategory === "India") {
        data = await api.getIndiaNews("All", fresh);
      } else if (newsCategory === "World") {
        data = await api.getWorldNews("All", fresh);
      } else {
        // Topic categories from world feed with filter
        data = await api.getWorldNews(newsCategory, fresh);
      }
      setNewsArticles(data.articles || []);
      setSyncedAt(data.synced_at || new Date().toISOString());
    } catch {
      // Fallback state on network error
    } finally {
      setNewsLoading(false);
      setNewsRefreshing(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setInputError("Image size exceeds maximum 15MB limit.");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setInputError(null);
      setActiveTab("image");
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVerification = async (e, overrides = {}) => {
    if (e) e.preventDefault();
    setInputError(null);

    const tab = overrides.tab || activeTab;
    const val = (overrides.value !== undefined ? overrides.value : inputValue).trim();

    if (tab === "url") {
      if (!val || !val.startsWith("http")) {
        setInputError("Please enter a valid news URL starting with http:// or https://");
        return;
      }
    } else if (tab === "text") {
      if (!val || val.length < 3) {
        setInputError("Please enter at least 3 characters of claim text to verify.");
        return;
      }
    } else if (tab === "image") {
      if (!imageFile) {
        setInputError("Please select an image to inspect for manipulation or claims.");
        return;
      }
    }

    setIsVerifying(true);
    setVerificationResult(null);

    // Stage progress animation
    let stage = 0;
    setVerificationStage(0);
    const stageTimer = setInterval(() => {
      if (stage < 6) {
        stage++;
        setVerificationStage(stage);
      }
    }, 260);

    try {
      let result;
      if (tab === "url") {
        result = await api.verifyUrl(val, language);
      } else if (tab === "text") {
        result = await api.verifyText(val, language);
      } else if (tab === "image") {
        result = await api.verifyImage(imageFile, language);
      }

      clearInterval(stageTimer);
      setVerificationStage(7);

      setTimeout(() => {
        setIsVerifying(false);
        setVerificationResult(result);
        addToHistory(result);
        showToast("Verification complete. Results cataloged.");
      }, 300);
    } catch (err) {
      clearInterval(stageTimer);
      setIsVerifying(false);
      setInputError(err.message || "Verification request failed. Please check network connection.");
    }
  };

  const handleVerifyNewsArticle = (art) => {
    const claimText = [art.title, art.description || art.summary].filter(Boolean).join(". ");
    setActiveTab("text");
    setInputValue(claimText);
    window.scrollTo({ top: 0, behavior: "smooth" });
    handleVerification(null, { tab: "text", value: claimText });
  };

  const sampleClaims = [
    { label: "RBI ₹500 Note Rumor", text: "Reserve Bank of India RBI is discontinuing 500 rupee notes immediately." },
    { label: "UNESCO Anthem Award", text: "UNESCO declares Indian National Anthem Jana Gana Mana best in the world." },
    { label: "Water Boiling Point", text: "Water boils at 100 degrees Celsius at standard atmospheric pressure." },
    { label: "WHO Travel Passports", text: "WHO mandates compulsory biometric digital health passports for all global travel." },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 pt-4 pb-12" ref={heroRef}>
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION (INVESTIGATIVE INTELLIGENCE PLATFORM)                      */}
      {/* ========================================================================= */}
      <section className="relative text-center space-y-8 pt-6 pb-2">
        
        {/* Editorial Brand Monogram & Classification Badge */}
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-white/[0.1] text-xs font-mono text-slate-300 backdrop-blur-xl shadow-lg shadow-black/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold tracking-wider text-indigo-300">TRUTHLENS</span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-slate-400">AUTOMATED FORENSIC ENGINE</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            VERIFY BEFORE YOU SHARE
          </h1>

          <p className="max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
            AI-powered real-time news and claim verification using evidence from multiple sources.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 2. MAIN VERIFICATION BOX (HIGH CONTRAST GLASS PANEL)                      */}
        {/* ========================================================================= */}
        <div className="max-w-3xl mx-auto bg-[#0D101A]/90 rounded-2xl border border-white/[0.12] shadow-2xl shadow-black/80 backdrop-blur-2xl p-3 sm:p-5 text-left transition-all duration-300 hover:border-white/[0.18]">
          
          {/* Segmented Mode Selector (URL | TEXT | IMAGE) */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
            <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/[0.06]">
              <button
                type="button"
                onClick={() => { setActiveTab("url"); setInputError(null); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "url"
                    ? "bg-white/[0.14] text-white shadow-sm border border-white/[0.12]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>URL</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("text"); setInputError(null); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "text"
                    ? "bg-white/[0.14] text-white shadow-sm border border-white/[0.12]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>TEXT</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("image"); setInputError(null); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "image"
                    ? "bg-white/[0.14] text-white shadow-sm border border-white/[0.12]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>IMAGE</span>
              </button>
            </div>

            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue("")}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Form Input Area */}
          <form onSubmit={handleVerification} className="space-y-4">
            {activeTab === "image" ? (
              /* Image Upload Dropzone */
              <div className="space-y-3">
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/[0.12] bg-black/40 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                      <div>
                        <p className="text-xs font-medium text-white truncate max-w-xs">{imageFile?.name}</p>
                        <p className="text-[11px] font-mono text-slate-400">
                          {(imageFile?.size / (1024 * 1024)).toFixed(2)} MB • Ready for forensics
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="p-2 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-white/[0.14] hover:border-indigo-500/50 bg-black/30 hover:bg-black/50 rounded-xl p-8 text-center cursor-pointer transition-all duration-200 group"
                  >
                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 mx-auto mb-2 transition-colors" />
                    <p className="text-xs font-medium text-slate-200">
                      Click to upload or drag & drop claim image / screenshot
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      PNG, JPG, WEBP up to 15MB • ELA & Metadata Forensics
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
            ) : activeTab === "url" ? (
              /* URL Input Box */
              <div className="relative">
                <input
                  type="url"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Paste a news URL (e.g. https://www.reuters.com/news/article...)"
                  className="w-full px-4 py-3.5 rounded-xl bg-black/50 border border-white/[0.1] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 text-slate-100 placeholder:text-slate-500 text-sm font-mono outline-none transition-all"
                  autoFocus
                />
              </div>
            ) : (
              /* Text Claim Input Box */
              <div className="relative">
                <textarea
                  rows={3}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      handleVerification(e);
                    }
                  }}
                  placeholder="Paste a news URL or enter a claim (e.g. RBI discontinuing ₹500 notes)..."
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/[0.1] focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 text-slate-100 placeholder:text-slate-500 text-sm font-normal outline-none transition-all resize-none leading-relaxed"
                  autoFocus
                />
              </div>
            )}

            {/* Error Message */}
            {inputError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{inputError}</span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cross-examined against 500+ authoritative wire repositories</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-all flex-1 sm:flex-initial"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all flex-1 sm:flex-initial"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5 text-white" />
                      <span>Verify Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick Query Pills */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-mono text-slate-500">Quick queries:</span>
            {sampleClaims.map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setActiveTab("text");
                  setInputValue(sample.text);
                  handleVerification(null, { tab: "text", value: sample.text });
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-slate-400 hover:text-indigo-200 text-[11px] font-mono transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. BELOW HERO: LIVE NEWS SECTION                                          */}
      {/* ========================================================================= */}
      <section className="space-y-6 pt-4">
        
        {/* Section Header & Categories */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>LIVE NEWS</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400 border border-white/[0.08] font-normal">
                REAL-TIME FEEDS
              </span>
            </h2>
          </div>

          {/* Category Filter Pills (India | World | Technology | Science | Health | Business) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = newsCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setNewsCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25 border border-indigo-500"
                      : "bg-black/40 hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 border border-white/[0.06]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => loadLiveNews(false, true)}
              title="Refresh Feeds"
              className="p-1.5 rounded-lg bg-black/40 hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06] transition-colors ml-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${newsRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* News Grid */}
        {newsLoading ? (
          /* Skeleton Loading State */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((sk) => (
              <div
                key={sk}
                className="rounded-2xl p-5 bg-[#0D101A]/60 border border-white/[0.06] space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-20 bg-white/[0.06] rounded" />
                  <div className="h-4 w-16 bg-white/[0.06] rounded" />
                </div>
                <div className="h-5 w-full bg-white/[0.08] rounded" />
                <div className="h-4 w-4/5 bg-white/[0.04] rounded" />
                <div className="pt-4 flex items-center justify-between border-t border-white/[0.04]">
                  <div className="h-3 w-16 bg-white/[0.04] rounded" />
                  <div className="h-7 w-20 bg-white/[0.08] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : newsArticles.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-4 rounded-2xl bg-[#0D101A]/40 border border-white/[0.06] space-y-3">
            <Radio className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
            <p className="text-sm font-medium text-slate-300">No active wire updates in this category.</p>
            <button
              onClick={() => loadLiveNews(true, true)}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-indigo-300 border border-white/[0.08] transition-colors"
            >
              Force Feed Refresh
            </button>
          </div>
        ) : (
          /* Populated News Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newsArticles.map((art, idx) => {
              const statusTag = art.is_live ? "LIVE WIRE" : "REVIEWED";
              return (
                <article
                  key={idx}
                  className="group rounded-2xl p-5 bg-[#0D101A]/80 hover:bg-[#121624] border border-white/[0.08] hover:border-indigo-500/40 shadow-xl shadow-black/40 backdrop-blur-xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="space-y-3">
                    {/* Header: Source, Time, Category, Verification Status */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
                      <span className="font-semibold text-indigo-300 truncate max-w-[120px]">
                        {art.source_name || "Official Wire"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {relativeTime(art.published_at)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {statusTag}
                        </span>
                      </div>
                    </div>

                    {/* Headline */}
                    <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-indigo-200 transition-colors line-clamp-2 leading-snug">
                      {art.title}
                    </h3>

                    {/* Summary Excerpt */}
                    {(art.description || art.summary) && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {art.description || art.summary}
                      </p>
                    )}
                  </div>

                  {/* Card Footer: Category Badge & VERIFY Action Button */}
                  <div className="pt-4 mt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      {art.category || newsCategory}
                    </span>

                    <div className="flex items-center gap-2">
                      {art.url && (
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Read full source article"
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleVerifyNewsArticle(art)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-600 text-xs font-semibold tracking-wider font-mono flex items-center gap-1.5 transition-all shadow-sm group/btn"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 group-hover/btn:text-white transition-colors" />
                        <span>VERIFY</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </section>

    </div>
  );
}
