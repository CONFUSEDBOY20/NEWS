import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { useInView, useCountUp } from "../utils/useAnimation";
import {
  Link2,
  FileText,
  ImageIcon,
  ShieldCheck,
  UploadCloud,
  X,
  AlertCircle,
  Clock,
  RefreshCw,
  LayoutGrid,
  Globe,
  Terminal,
  FlaskConical,
  Heart,
  BarChart3,
  Leaf,
  Dumbbell,
  Film,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Radio,
  Activity,
  Layers,
} from "lucide-react";

function StatisticsBar() {
  const [sourcesRef, sourcesCount] = useCountUp(500, 1300);
  const [archivesRef, archivesCount] = useCountUp(100, 1100);
  const [metricsRef, metricsCount] = useCountUp(50, 950);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto w-full pt-1">
      <div
        ref={sourcesRef}
        className="glass-card rounded-2xl p-4 text-center border border-slate-200/80 dark:border-white/[0.08] hover-lift group"
      >
        <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
          <Globe className="w-4 h-4" />
          <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">
            {sourcesCount}+
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-sans">
          Wire Sources Monitored
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Global, regional & national feeds
        </p>
      </div>

      <div
        ref={archivesRef}
        className="glass-card rounded-2xl p-4 text-center border border-slate-200/80 dark:border-white/[0.08] hover-lift group"
      >
        <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
          <Layers className="w-4 h-4" />
          <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">
            {archivesCount}+
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-sans">
          Institutional Archives
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Government & public databases
        </p>
      </div>

      <div
        ref={metricsRef}
        className="glass-card rounded-2xl p-4 text-center border border-slate-200/80 dark:border-white/[0.08] hover-lift group"
      >
        <div className="flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400 mb-1">
          <Activity className="w-4 h-4" />
          <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">
            {metricsCount}+
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 font-sans">
          Forensic Checks / Claim
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          ELA, consensus & NLP analysis
        </p>
      </div>
    </div>
  );
}

function NewsCardSkeleton() {
  return (
    <div className="w-[260px] sm:w-[280px] shrink-0 rounded-2xl overflow-hidden bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
      <div>
        <div className="h-36 w-full skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
        <div className="p-4 space-y-3">
          <div className="h-4 w-3/4 rounded-md skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
          <div className="h-3 w-full rounded-md skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
          <div className="h-3 w-4/5 rounded-md skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
        </div>
      </div>
      <div className="px-4 pb-4 pt-1">
        <div className="h-3.5 w-16 rounded-md skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
      </div>
    </div>
  );
}

function relativeTime(iso) {
  if (!iso) return "just now";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "2h ago";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Curated high-resolution fallback topic images matching the exact reference style
const categoryImages = {
  World: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
  Politics: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80",
  Technology: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
  Science: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80",
  Health: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=800&q=80",
  Business: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  Economy: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  Environment: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
  Climate: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
  Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
  Entertainment: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
};

const categoryBadgeConfig = {
  World: { label: "World", bg: "bg-blue-600", icon: Globe },
  Politics: { label: "Politics", bg: "bg-blue-600", icon: Globe },
  Technology: { label: "Technology", bg: "bg-purple-600", icon: Terminal },
  Science: { label: "Science", bg: "bg-teal-600", icon: FlaskConical },
  Health: { label: "Health", bg: "bg-rose-600", icon: Heart },
  Business: { label: "Business", bg: "bg-amber-600", icon: BarChart3 },
  Economy: { label: "Business", bg: "bg-amber-600", icon: BarChart3 },
  Environment: { label: "Environment", bg: "bg-emerald-600", icon: Leaf },
  Climate: { label: "Environment", bg: "bg-emerald-600", icon: Leaf },
  Sports: { label: "Sports", bg: "bg-indigo-600", icon: Dumbbell },
  Entertainment: { label: "Entertainment", bg: "bg-pink-600", icon: Film },
  Default: { label: "News", bg: "bg-blue-600", icon: Globe },
};

// Default high-fidelity articles matching user reference image
const showcaseArticles = [
  {
    id: "showcase-1",
    title: "Global leaders meet to discuss climate action at UN summit",
    description: "World leaders gather to strengthen climate goals and discuss renewable energy solutions...",
    category: "World",
    time_ago: "2h ago",
    url_to_image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
    url: "https://un.org"
  },
  {
    id: "showcase-2",
    title: "New AI model shows major breakthrough in reasoning",
    description: "Researchers unveil a next-generation AI model that demonstrates significant improvements in complex multi-step logic...",
    category: "Technology",
    time_ago: "3h ago",
    url_to_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    url: "https://techcrunch.com"
  },
  {
    id: "showcase-3",
    title: "New satellite images reveal unexpected changes in Arctic",
    description: "Recent satellite data shows surprising environmental changes in the Arctic region according to international researchers...",
    category: "Science",
    time_ago: "5h ago",
    url_to_image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80",
    url: "https://nasa.gov"
  },
  {
    id: "showcase-4",
    title: "Breakthrough in early detection of rare genetic disease",
    description: "Scientists develop a new test that can detect the disease years before symptoms appear in clinical patients...",
    category: "Health",
    time_ago: "6h ago",
    url_to_image: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=800&q=80",
    url: "https://nature.com"
  },
  {
    id: "showcase-5",
    title: "Markets rally as inflation shows signs of cooling",
    description: "Global markets see positive movement after new inflation data indicates a slowdown across key industrial sectors...",
    category: "Business",
    time_ago: "8h ago",
    url_to_image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    url: "https://bloomberg.com"
  }
];

export function FactCheckHero() {
  const {
    language,
    inputPreload,
    setInputPreload,
    setIsVerifying,
    isVerifying,
    setVerificationStage,
    setVerificationResult,
    setActiveClaimText,
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
  const cardsContainerRef = useRef(null);

  // Live News State Below Hero
  const [newsCategory, setNewsCategory] = useState("All");
  const [newsArticles, setNewsArticles] = useState(showcaseArticles);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);

  const categories = [
    { id: "All", label: "All News", icon: LayoutGrid },
    { id: "World", label: "World", icon: Globe },
    { id: "Technology", label: "Technology", icon: Terminal },
    { id: "Science", label: "Science", icon: FlaskConical },
    { id: "Health", label: "Health", icon: Heart },
    { id: "Business", label: "Business", icon: BarChart3 },
    { id: "Environment", label: "Environment", icon: Leaf },
    { id: "Sports", label: "Sports", icon: Dumbbell },
    { id: "Entertainment", label: "Entertainment", icon: Film },
  ];

  // Preloaded input from ticker or card click
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

  // Load News on category change
  useEffect(() => {
    loadLiveNews(false, false);
  }, [newsCategory]);

  const loadLiveNews = async (showLoader = false, fresh = false) => {
    if (showLoader) setNewsLoading(true);
    else setNewsRefreshing(true);

    try {
      let data;
      if (newsCategory === "All") {
        data = await api.getWorldNews("All", fresh);
      } else {
        data = await api.getWorldNews(newsCategory, fresh);
      }

      if (data?.articles && data.articles.length > 0) {
        // Enrich articles with fallback images if url_to_image is absent
        const enriched = data.articles.map((art, idx) => {
          const cat = art.category || newsCategory || "World";
          const fallbackImg = categoryImages[cat] || categoryImages.World;
          return {
            ...art,
            category: cat,
            time_ago: relativeTime(art.published_at),
            url_to_image: art.url_to_image || showcaseArticles[idx % showcaseArticles.length]?.url_to_image || fallbackImg
          };
        });
        setNewsArticles(enriched);
      } else {
        // Fallback to showcase matching category if API has no results
        const filtered = newsCategory === "All"
          ? showcaseArticles
          : showcaseArticles.filter(a => a.category.toLowerCase() === newsCategory.toLowerCase());
        setNewsArticles(filtered.length > 0 ? filtered : showcaseArticles);
      }
      setSyncedAt(data?.synced_at || new Date().toISOString());
    } catch {
      setNewsArticles(showcaseArticles);
    } finally {
      setNewsLoading(false);
      setNewsRefreshing(false);
    }
  };

  const scrollCards = (direction) => {
    if (cardsContainerRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      cardsContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
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

    const claimToVerify = tab === "image"
      ? (imageFile?.name || "Uploaded Claim Image")
      : val;
    setActiveClaimText(claimToVerify);
    setIsVerifying(true);
    setVerificationResult(null);

    let stage = 0;
    setVerificationStage(0);
    const stageTimer = setInterval(() => {
      if (stage < 4) {
        stage++;
        setVerificationStage(stage);
      }
    }, 450);

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
      setVerificationStage(4);

      setTimeout(() => {
        setIsVerifying(false);
        setVerificationResult(result);
        addToHistory(result);
        showToast("Verification complete. Results cataloged.");
      }, 400);
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
    { label: "Discontinuing ₹500 notes", text: "Reserve Bank of India RBI is discontinuing 500 rupee notes immediately." },
    { label: "UNESCO Anthem award", text: "UNESCO declares Indian National Anthem Jana Gana Mana best in the world." },
    { label: "WHO travel rules", text: "WHO mandates compulsory biometric digital health passports for all global travel." },
    { label: "Boiling point of water", text: "Water boils at 100 degrees Celsius at standard atmospheric pressure." },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pt-8 pb-12 animate-fade-up relative overflow-hidden" ref={heroRef}>
      
      {/* Subtle Floating Ambient Globe Mesh (Professional & Minimal) */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 pointer-events-none -z-10 overflow-hidden opacity-30 dark:opacity-20 select-none animate-float-slow">
        <svg viewBox="0 0 800 350" className="w-full h-full text-emerald-500/40 dark:text-emerald-400/25" fill="none">
          <circle cx="400" cy="175" r="140" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <ellipse cx="400" cy="175" rx="140" ry="50" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="400" cy="175" rx="50" ry="140" stroke="currentColor" strokeWidth="1" />
          <path d="M 260 175 Q 400 245 540 175" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 1. HERO TITLE & TYPOGRAPHY                                               */}
      {/* ========================================================================= */}
      <section className="text-center space-y-4 pt-2 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
          <span>Real-time Multi-Source Fact Check</span>
        </div>

        {/* Progressive Headline Entrance (Not letter-by-letter) */}
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight max-w-3xl mx-auto font-sans">
          <span className="inline-block animate-fade-up [animation-duration:500ms]">
            Verify news, claims, and media
          </span>{" "}
          <span className="inline-block text-emerald-600 dark:text-emerald-400 animate-fade-up [animation-duration:700ms] [animation-delay:150ms]">
            with confidence.
          </span>
        </h1>

        <p className="max-w-xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal leading-relaxed animate-fade-up [animation-duration:800ms] [animation-delay:220ms]">
          Cross-examine viral headlines, digital articles, and images against indexed archives and institutional records.
        </p>
      </section>

      {/* ========================================================================= */}
      {/* 2. VERIFICATION INPUT CARD                                                */}
      {/* ========================================================================= */}
      <section className="max-w-3xl mx-auto relative z-10">
        <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/[0.08] shadow-xl shadow-black/5 dark:shadow-black/30">
          
          {/* Segmented Mode Selector */}
          <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-white/[0.06] pb-3 mb-4">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/40 p-1 rounded-xl border border-slate-200/60 dark:border-white/[0.05]">
              <button
                type="button"
                onClick={() => { setActiveTab("text"); setInputError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "text"
                    ? "bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200 dark:border-white/[0.1]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Claim Text</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("url"); setInputError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "url"
                    ? "bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200 dark:border-white/[0.1]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Link2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Web URL</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("image"); setInputError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === "image"
                    ? "bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white font-semibold shadow-sm border border-slate-200 dark:border-white/[0.1]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>Image File</span>
              </button>
            </div>

            {inputValue && (
              <button
                type="button"
                onClick={() => setInputValue("")}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Form Input Area */}
          <form onSubmit={handleVerification} className="space-y-4">
            {activeTab === "image" ? (
              <div className="space-y-3">
                {imagePreview ? (
                  <div className="relative rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-black/30 p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={imagePreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-white/10" />
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-xs">{imageFile?.name}</p>
                        <p className="text-[11px] font-mono text-slate-500">
                          {(imageFile?.size / (1024 * 1024)).toFixed(2)} MB • Ready to verify
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-white/[0.12] hover:border-emerald-500/50 bg-slate-50/50 dark:bg-black/20 hover:bg-slate-50 dark:hover:bg-black/40 rounded-xl p-8 text-center cursor-pointer transition-all duration-150 group"
                  >
                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 mx-auto mb-2 transition-colors" />
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Click to upload claim image or screenshot
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">
                      PNG, JPG, WEBP up to 15MB
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
              <div>
                <input
                  type="url"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Paste article URL (e.g., https://www.reuters.com/...)"
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.1] focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm outline-none transition-all font-sans"
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <textarea
                  rows={3}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      handleVerification(e);
                    }
                  }}
                  placeholder="Paste statement, social media message, or article excerpt to verify..."
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.1] focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm outline-none transition-all resize-none font-sans leading-relaxed"
                  autoFocus
                />
              </div>
            )}

            {/* Error Message */}
            {inputError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}

            {/* Submit Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 font-mono text-[10px]">Ctrl+Enter</kbd> to submit
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="btn-press w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/25 text-white font-medium text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cross-Checking Evidence...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Claim</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Example Chips */}
          <div className="mt-5 pt-4 border-t border-slate-200/70 dark:border-white/[0.06] flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 text-[11px] mr-1">Try example:</span>
            {sampleClaims.map((claim) => (
              <button
                key={claim.label}
                type="button"
                onClick={() => {
                  setActiveTab("text");
                  setInputValue(claim.text);
                  setInputError(null);
                }}
                className="btn-press px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 text-[11px] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
              >
                {claim.label}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2.5 ANIMATED STATISTICS BAR (500+, 100+, 50+)                             */}
      {/* ========================================================================= */}
      <section className="relative z-10">
        <StatisticsBar />
      </section>

      {/* ========================================================================= */}
      {/* 3. TRENDING WIRE HEADLINES SECTION (EXACT DESIGN WITH IMAGES)             */}
      {/* ========================================================================= */}
      <section className="bg-white/80 dark:bg-[#0C101B]/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/[0.08] shadow-sm relative overflow-hidden space-y-6">
        
        {/* Subtle Watermark Graphic */}
        <div className="absolute right-0 top-0 w-96 h-96 pointer-events-none opacity-[0.03] dark:opacity-[0.05] select-none">
          <svg viewBox="0 0 200 200" fill="currentColor" className="w-full h-full text-blue-500">
            <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="2" fill="none" />
            <ellipse cx="100" cy="100" rx="80" ry="30" stroke="currentColor" strokeWidth="2" fill="none" />
            <ellipse cx="100" cy="100" rx="30" ry="80" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE NEWS FEED
                <Radio className="w-3.5 h-3.5 inline ml-0.5" />
              </span>

              <button
                onClick={() => loadLiveNews(false, true)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/70 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-[11px] text-slate-600 dark:text-slate-400 transition-colors ml-2"
                title="Refresh feed"
              >
                <span>Updated just now</span>
                <RefreshCw className={`w-3 h-3 ${newsRefreshing ? "animate-spin text-blue-500" : ""}`} />
              </button>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1.5 font-sans">
              Trending <span className="text-blue-600 dark:text-blue-400 italic">Wire</span> Headlines
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Latest news from around the world • Click "Verify" on any headline to run verification
            </p>
          </div>

          {/* Right Badge: Stay Informed • Verify News • Fight Misinformation */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/50 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm shrink-0">
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span>Stay Informed</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Verify News</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span>Fight Misinformation</span>
          </div>
        </div>

        {/* Categories Bar & Navigation Arrows */}
        <div className="flex items-center justify-between gap-3 pt-2 relative z-10">
          
          {/* Category Pill Buttons with 150ms press animations */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = newsCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setNewsCategory(cat.id)}
                  className={`btn-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
                    isActive
                      ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/25 scale-[1.02]"
                      : "bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-white/[0.06]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Carousel Arrows */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => scrollCards("left")}
              className="btn-press w-8 h-8 rounded-full border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-sm cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollCards("right")}
              className="btn-press w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-sm shadow-blue-600/20 cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Horizontal Cards Row with Images & Skeleton Loader Support */}
        <div
          ref={cardsContainerRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth scrollbar-none relative z-10 transition-opacity duration-200"
        >
          {newsLoading ? (
            <>
              <NewsCardSkeleton />
              <NewsCardSkeleton />
              <NewsCardSkeleton />
              <NewsCardSkeleton />
            </>
          ) : (
            newsArticles.map((art) => {
              const badgeCfg = categoryBadgeConfig[art.category] || categoryBadgeConfig.Default;
              const CategoryIcon = badgeCfg.icon;
              const imageUrl = art.url_to_image || categoryImages[art.category] || categoryImages.World;

              return (
                <article
                  key={art.id}
                  className="w-[260px] sm:w-[280px] shrink-0 rounded-2xl overflow-hidden bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-lg transition-all duration-200 hover-lift flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Thumbnail Image with Category & Time Overlay Badges and Subtle Zoom */}
                    <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                      <img
                        src={imageUrl}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                        loading="lazy"
                      />
                      
                      {/* Top-left Category Pill */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white shadow-sm ${badgeCfg.bg}`}>
                          <CategoryIcon className="w-3 h-3" />
                          <span>{badgeCfg.label}</span>
                        </span>
                      </div>

                      {/* Top-right Time Pill */}
                      <div className="absolute top-2.5 right-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-white/90 bg-black/60 backdrop-blur-md">
                          {art.time_ago || relativeTime(art.published_at)}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 font-sans">
                        {art.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {art.description || art.summary}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Verify Action Link with Smooth Arrow Slide */}
                  <div className="px-4 pb-4 pt-1">
                    <button
                      onClick={() => handleVerifyNewsArticle(art)}
                      className="group/btn inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-150 cursor-pointer"
                    >
                      <span>Verify</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
                    </button>
                  </div>

                </article>
              );
            })
          )}
        </div>

      </section>

    </div>
  );
}
