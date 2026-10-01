import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import {
  fetchLatestNews,
  fetchHeroFeaturedStories,
  fetchRecentChecks,
  fetchPopularInvestigations,
  resolveRealTimeNewsImage,
  HERO_FEATURED_STORIES,
  INITIAL_RECENT_CHECKS,
  POPULAR_INVESTIGATIONS,
} from "../services/newsService";
import { ArticleDetailModal } from "./ArticleDetailModal";
import { NewsReaderFactCheckModal } from "./NewsReaderFactCheckModal";

import {
  FileText,
  Link2,
  Image as ImageIcon,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  UploadCloud,
  X,
  RefreshCw,
} from "lucide-react";

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
    history,
    setActiveView,
    setShowHistoryDrawer,
    showToast,
  } = useApp();

  // Verification Input State
  const [activeTab, setActiveTab] = useState("text"); // 'text', 'url', 'image'
  const [inputValue, setInputValue] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [inputError, setInputError] = useState(null);
  const fileInputRef = useRef(null);

  // Hero Featured Story Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Latest News State
  const [newsCategory, setNewsCategory] = useState("All");
  const [newsArticles, setNewsArticles] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState(false);

  // Selected Investigation for Modal
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);

  // Selected News Article for Reader & Fact-Check Modal
  const [selectedNewsArticle, setSelectedNewsArticle] = useState(null);

  const categories = ["All", "India", "World", "Technology", "Health", "Environment", "Politics"];

  const exampleChips = [
    { label: '"5G causes health problems"', text: "5G causes health problems" },
    { label: '"Government gives free laptops"', text: "Government is giving free laptops to all students" },
    { label: '"This image is from a recent flood"', text: "This viral flood image is from a recent incident in Assam" },
  ];

  // Dynamic Real-Time Side News States
  const [featuredStories, setFeaturedStories] = useState(HERO_FEATURED_STORIES);
  const [popularInvestigations, setPopularInvestigations] = useState(POPULAR_INVESTIGATIONS);
  const [liveChecks, setLiveChecks] = useState(INITIAL_RECENT_CHECKS);

  // Auto-scroll featured story carousel every 8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % (featuredStories.length || 1));
    }, 8000);
    return () => clearInterval(timer);
  }, [featuredStories]);

  // Load Real-Time Side News on mount
  useEffect(() => {
    let isMounted = true;
    async function loadDynamicContent() {
      try {
        const [stories, checks, invs] = await Promise.allSettled([
          fetchHeroFeaturedStories(),
          fetchRecentChecks(),
          fetchPopularInvestigations(),
        ]);
        if (!isMounted) return;
        if (stories.status === "fulfilled" && stories.value?.length > 0) {
          setFeaturedStories(stories.value);
        }
        if (checks.status === "fulfilled" && checks.value?.length > 0) {
          setLiveChecks(checks.value);
        }
        if (invs.status === "fulfilled" && invs.value?.length > 0) {
          setPopularInvestigations(invs.value);
        }
      } catch (err) {
        console.warn("Using default side news fallback:", err);
      }
    }
    loadDynamicContent();
    return () => { isMounted = false; };
  }, []);

  // Preloaded input trigger from Ticker or History

  useEffect(() => {
    if (!inputPreload) return;
    const { type, value, title, autoStart } = inputPreload;
    if (type === "url") {
      setActiveTab("url");
      setInputValue(value);
      if (title) setActiveClaimText(title);
    } else {
      setActiveTab("text");
      setInputValue(value);
      if (title) setActiveClaimText(title);
    }
    setInputPreload(null);
    if (autoStart && value) {
      triggerVerification(type || "text", value, title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputPreload]);

  // Load Latest News based on active category
  useEffect(() => {
    loadNews(newsCategory);
  }, [newsCategory]);

  const loadNews = async (cat, fresh = false) => {
    setNewsLoading(true);
    setNewsError(false);
    try {
      const res = await fetchLatestNews({ category: cat, fresh });
      if (res?.articles && res.articles.length > 0) {
        setNewsArticles(res.articles);
      } else {
        setNewsArticles([]);
      }
    } catch {
      setNewsError(true);
    } finally {
      setNewsLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setInputError("Image size exceeds 15MB limit.");
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

  const triggerVerification = async (tabToUse, valToUse, titleToUse) => {
    const tab = tabToUse || activeTab;
    const val = (valToUse !== undefined ? valToUse : inputValue).trim();
    setInputError(null);

    if (tab === "url") {
      try {
        const parsed = new URL(val);
        if (!parsed.protocol.startsWith("http")) throw new Error();
      } catch {
        setInputError("Please enter a valid news URL (e.g. https://www.reuters.com/...)");
        return;
      }
    } else if (tab === "text") {
      if (!val || val.length < 3) {
        setInputError("Please enter a claim headline or message of at least 3 characters.");
        return;
      }
    } else if (tab === "image") {
      if (!imageFile) {
        setInputError("Please select or drop an image to verify.");
        return;
      }
    }

    const claimToVerify = titleToUse || (tab === "image" ? imageFile?.name || "Uploaded Claim Image" : val);
    setActiveClaimText(claimToVerify);
    setIsVerifying(true);
    setVerificationResult(null);

    // Multi-stage progress indicator animation
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
      const langParam = selectedLanguage === "auto" ? language : selectedLanguage;
      if (tab === "url") {
        result = await api.verifyUrl(val, langParam, titleToUse);
      } else if (tab === "text") {
        result = await api.verifyText(val, langParam);
      } else if (tab === "image") {
        result = await api.verifyImage(imageFile, langParam);
      }

      if (titleToUse && result) {
        result.primary_claim = titleToUse;
        result.article_title = titleToUse;
        if (tab === "url") {
          result.article_url = val;
        }
      }

      clearInterval(stageTimer);
      setVerificationStage(4);

      setTimeout(() => {
        setIsVerifying(false);
        setVerificationResult(result);
        addToHistory(result);
        if (showToast) showToast("Fact-check completed with corroborating sources.");
      }, 350);
    } catch (err) {
      clearInterval(stageTimer);
      setIsVerifying(false);
      setInputError(err.message || "Verification request failed. Please check your network connection.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    triggerVerification(activeTab, inputValue);
  };

  // Merge real history with curated initial checks for Recent Checks panel
  const displayChecks = React.useMemo(() => {
    const formattedHistory = (history || []).slice(0, 4).map((h) => {
      let statusType = "review";
      let status = "Needs Review";
      const v = (h.verdict || "").toUpperCase();
      if (v.includes("TRUE")) {
        statusType = "true";
        status = "True";
      } else if (v.includes("FALSE")) {
        statusType = "false";
        status = "False";
      } else if (v.includes("MISLEADING") || v.includes("PARTIAL")) {
        statusType = "misleading";
        status = "Misleading";
      }

      return {
        id: h.id,
        status,
        statusType,
        headline: h.input || "Claim Verification",
        explanation: h.resultData?.summary || "Analyzed against verified registries.",
        time_ago: "Recently",
        image_url:
          statusType === "true"
            ? INITIAL_RECENT_CHECKS[1].image_url
            : statusType === "false"
            ? INITIAL_RECENT_CHECKS[2].image_url
            : INITIAL_RECENT_CHECKS[0].image_url,
        claim_text: h.input,
        resultData: h.resultData,
      };
    });

    if (formattedHistory.length >= 4) return formattedHistory;
    // Fill remainder with real-time checks
    const needed = 4 - formattedHistory.length;
    return [...formattedHistory, ...liveChecks.slice(0, needed)];
  }, [history, liveChecks]);

  const activeFeaturedStory = featuredStories[carouselIndex] || featuredStories[0];


  const getStatusBadge = (statusType, statusText) => {
    if (statusType === "true") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>{statusText || "True"}</span>
        </span>
      );
    }
    if (statusType === "false") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60">
          <XCircle className="w-2.5 h-2.5" />
          <span>{statusText || "False"}</span>
        </span>
      );
    }
    if (statusType === "misleading") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>{statusText || "Misleading"}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
        <HelpCircle className="w-2.5 h-2.5" />
        <span>{statusText || "Needs Review"}</span>
      </span>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
      
      {/* ========================================================================= */}
      {/* 1. TOP HERO SECTION (3 Columns: Form | Featured Story | Recent Checks)    */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column (5 of 12 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider">
              <span className="w-4 h-[2px] bg-blue-600 dark:bg-blue-400 inline-block" />
              <span>FACT CHECKING</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] font-sans">
              Check news, claims and media before you believe.
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
              Verify viral headlines, social media claims, images and articles with trusted sources.
            </p>
          </div>

          {/* Verification Box */}
          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => { setActiveTab("text"); setInputError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "text"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Check Text</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("url"); setInputError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "url"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Check URL</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("image"); setInputError(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === "image"
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Check Image</span>
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {activeTab === "text" && (
                <div className="relative">
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Paste a news headline, social media message, or article excerpt to verify..."
                    className="w-full p-3 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-none font-sans leading-relaxed"
                  />
                  <div className="absolute right-2.5 bottom-2.5 text-[10px] text-slate-400 font-mono">
                    {inputValue.length}/1000
                  </div>
                </div>
              )}

              {activeTab === "url" && (
                <div className="space-y-1">
                  <input
                    type="url"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="https://example.com/news-story..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans"
                  />
                  <p className="text-[11px] text-slate-400">
                    TruthLens fetches the article text and cross-examines key claims against wire registries.
                  </p>
                </div>
              )}

              {activeTab === "image" && (
                <div className="space-y-2">
                  {imagePreview ? (
                    <div className="relative rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded-md" />
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">
                            {imageFile?.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {(imageFile?.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-1 rounded text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-lg p-5 text-center cursor-pointer transition-colors"
                    >
                      <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Click or drag image to verify authenticity
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">PNG, JPG, WEBP up to 15MB</p>
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
              )}

              {/* Error Message */}
              {inputError && (
                <div className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{inputError}</span>
                </div>
              )}

              {/* Action Bar: Language Selector + Check Claim Button */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-lg pl-2.5 pr-7 py-2 focus:outline-none focus:border-blue-600 font-medium cursor-pointer"
                  >
                    <option value="auto">Auto-detect language</option>
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="bn">বাংলা (Bengali)</option>
                    <option value="mr">मराठी (Marathi)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Check Claim</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Example Chips */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 text-[11px]">Try an example:</span>
              {exampleChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveTab("text");
                    setInputValue(chip.text);
                    setInputError(null);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] transition-colors cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Center Column: Featured Story Card (4 of 12 cols on desktop) */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <div className="relative h-full min-h-[360px] sm:min-h-[400px] rounded-xl overflow-hidden group shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            {/* Story Image */}
            <img
              src={activeFeaturedStory.image_url}
              alt={activeFeaturedStory.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Gradient Overlay for Editorial Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

            {/* Top Badge */}
            <div className="relative z-10 p-4 flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold text-white tracking-wider ${activeFeaturedStory.badgeColor}`}>
                {activeFeaturedStory.badge}
              </span>

              {/* Prev / Next Arrows */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCarouselIndex((prev) => (prev === 0 ? featuredStories.length - 1 : prev - 1))}
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Previous story"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCarouselIndex((prev) => (prev + 1) % featuredStories.length)}
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Next story"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="relative z-10 p-5 space-y-2 text-white">
              <h2
                onClick={() => {
                  setSelectedNewsArticle({
                    id: activeFeaturedStory.id,
                    title: activeFeaturedStory.title,
                    description: activeFeaturedStory.description,
                    image_url: activeFeaturedStory.image_url,
                    source: activeFeaturedStory.source || "Featured Press Wire",
                    category: activeFeaturedStory.badge || "Fact Check",
                    time_ago: "Breaking",
                    link: activeFeaturedStory.link || "#",
                    content_paragraphs: [
                      activeFeaturedStory.description,
                      "Investigative units corroborate that this developing claim has reached viral velocity across digital messaging channels.",
                      "Official statements from primary public bureaus continue to provide additional qualifying evidence.",
                    ],
                  });
                }}
                className="text-lg sm:text-xl font-bold leading-snug hover:underline cursor-pointer font-sans"
              >
                {activeFeaturedStory.title}
              </h2>
              <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                {activeFeaturedStory.description}
              </p>

              {/* Navigation Dots */}
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {featuredStories.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCarouselIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      carouselIndex === idx ? "w-5 bg-white" : "w-1.5 bg-white/40"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>


          </div>
        </div>

        {/* Right Column: Recent Checks Panel (3 of 12 cols on desktop) */}
        <div className="lg:col-span-3 flex flex-col justify-between">
          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs h-full flex flex-col justify-between space-y-3">
            
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                Recent Checks
              </h3>
              <button
                onClick={() => setShowHistoryDrawer(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Checks List */}
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              {displayChecks.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.resultData) {
                      setVerificationResult(item.resultData);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } else if (item.article) {
                      setSelectedNewsArticle({
                        ...item.article,
                        title: item.headline || item.article.title,
                        description: item.explanation || item.article.description,
                        image_url: item.image_url || item.article.image_url,
                        precomputed_verdict: item.status?.toUpperCase() === "TRUE" ? "TRUE" : (item.status?.toUpperCase() === "FALSE" ? "FALSE" : "MISLEADING"),
                        precomputed_explanation: item.explanation || item.article.description,
                      });
                    } else {
                      setSelectedNewsArticle({
                        id: item.id,
                        title: item.headline,
                        description: item.explanation || item.claim_text,
                        image_url: item.image_url,
                        source: "Recent Fact Check Wire",
                        category: item.status || "Fact Check",
                        time_ago: item.time_ago || "recently",
                        link: "#",
                        precomputed_verdict: item.status?.toUpperCase() === "TRUE" ? "TRUE" : (item.status?.toUpperCase() === "FALSE" ? "FALSE" : "MISLEADING"),
                        precomputed_explanation: item.explanation,
                        content_paragraphs: [
                          item.headline,
                          item.explanation || "Analyzed against primary documentation and verified wire telemetry.",
                          "Forensic investigation cross-referenced against public registry records and accredited newsroom findings."
                        ],
                      });
                    }
                  }}
                  className="flex items-start gap-3 group cursor-pointer p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  <img
                    src={item.image_url}
                    alt={item.headline}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = resolveRealTimeNewsImage(item.headline, item.status);
                    }}
                    className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-100 dark:border-slate-800 group-hover:opacity-90"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      {getStatusBadge(item.statusType, item.status)}
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {item.time_ago}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.headline}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 2. LOWER SECTION (2 Columns: Left 8 cols | Right 4 cols)                  */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (8 of 12 cols): Latest News + How TruthLens Works */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Latest News Card Container */}
          <div className="space-y-4">
            
            {/* Header + View all */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
                Latest News
              </h2>
              <button
                onClick={() => setActiveView("world-news")}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => {
                const isActive = newsCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setNewsCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* 4 Cards Grid */}
            {newsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] p-3 space-y-2.5 animate-pulse"
                  >
                    <div className="h-28 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                ))}
              </div>
            ) : newsError && newsArticles.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] space-y-3">
                <p className="text-xs text-slate-500">Failed to load news for this category.</p>
                <button
                  onClick={() => loadNews(newsCategory, true)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Retry News Fetch
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {newsArticles.slice(0, 4).map((art) => (
                  <article
                    key={art.id}
                    onClick={() => setSelectedNewsArticle(art)}
                    className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-lg hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-200 group flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      {/* Image Thumbnail with Original News Photo */}
                      <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        <img
                          src={art.image_url}
                          alt={art.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80";
                          }}
                        />
                        {/* Live Wire Badge */}
                        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>LIVE</span>
                        </div>

                        {/* Category Badge */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-md text-[10px] font-bold text-blue-300 border border-slate-700/50">
                          {art.category || newsCategory}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span className="truncate max-w-[130px] font-medium text-slate-600 dark:text-slate-300">
                            {art.source || "Official Wire"}
                          </span>
                          <span>{art.time_ago || "recently"}</span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-sans">
                          {art.title}
                        </h3>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {art.description}
                        </p>
                      </div>
                    </div>

                    {/* Interactive CTA to Open Reader & Fake/Real Toggle */}
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:underline">
                        <span>Read & Check</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-[10px] font-mono text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                        AI Verify
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}


          </div>

          {/* How TruthLens Works Section (Directly under Latest News) */}
          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
              How TruthLens works
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
              
              {/* Step 1 */}
              <div className="md:col-span-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                  1
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Submit a claim
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Paste text, URL or upload an image.
                  </p>
                </div>
              </div>

              {/* Arrow 1 */}
              <div className="hidden md:flex md:col-span-1 justify-center text-slate-300 dark:text-slate-700">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Step 2 */}
              <div className="md:col-span-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-sm shrink-0">
                  <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    We analyse it
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Our system checks multiple trusted sources and verifies the content.
                  </p>
                </div>
              </div>

              {/* Arrow 2 */}
              <div className="hidden md:flex md:col-span-1 justify-center text-slate-300 dark:text-slate-700">
                <ArrowRight className="w-4 h-4" />
              </div>

              {/* Step 3 */}
              <div className="md:col-span-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Get a clear result
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    See whether it's true, false, misleading or needs more context.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Right Column (4 of 12 cols): Popular Investigations */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
              Popular Investigations
            </h2>
            <button
              onClick={() => setActiveView("articles")}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3.5">
            {/* Featured Big Investigation Card */}
            {popularInvestigations.filter((i) => i.featured).map((inv) => (
              <div
                key={inv.id}
                onClick={() => {
                  setSelectedNewsArticle({
                    id: inv.id,
                    title: inv.title,
                    description: inv.description,
                    image_url: inv.image_url,
                    category: inv.category || "INVESTIGATION",
                    source: inv.source || "TruthLens Investigations",
                    time_ago: inv.date || "recently",
                    link: inv.link || "#",
                    precomputed_verdict: (inv.verdict || "").toUpperCase().includes("TRUE") ? "TRUE" : ((inv.verdict || "").toUpperCase().includes("FALSE") ? "FALSE" : "MISLEADING"),
                    precomputed_explanation: inv.evidence_summary || inv.description,
                    content_paragraphs: inv.content_paragraphs || [
                      inv.description,
                      inv.evidence_summary || "Investigative forensics cross-referenced primary sources, laboratory evidence, and public registry records.",
                      "Independent verification desks conclude the factual veracity according to accredited reporting standards."
                    ],
                  });
                }}
                className="relative h-48 sm:h-52 rounded-xl overflow-hidden group shadow-xs border border-slate-200 dark:border-slate-800 cursor-pointer flex flex-col justify-between"
              >
                <img
                  src={inv.image_url}
                  alt={inv.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = resolveRealTimeNewsImage(inv.title, inv.category);
                  }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                <div className="relative z-10 p-3">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-white/20 text-white backdrop-blur-xs">
                    {inv.category}
                  </span>
                </div>

                <div className="relative z-10 p-3.5 space-y-1 text-white">
                  <h3 className="text-sm font-bold leading-snug font-sans group-hover:underline">
                    {inv.title}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-mono">{inv.date}</p>
                </div>
              </div>
            ))}

            {/* Smaller Investigation Rows */}
            {popularInvestigations.filter((i) => !i.featured).map((inv) => (
              <div
                key={inv.id}
                onClick={() => {
                  setSelectedNewsArticle({
                    id: inv.id,
                    title: inv.title,
                    description: inv.description,
                    image_url: inv.image_url,
                    category: inv.category || "INVESTIGATION",
                    source: inv.source || "TruthLens Investigations",
                    time_ago: inv.date || "recently",
                    link: inv.link || "#",
                    precomputed_verdict: (inv.verdict || "").toUpperCase().includes("TRUE") ? "TRUE" : ((inv.verdict || "").toUpperCase().includes("FALSE") ? "FALSE" : "MISLEADING"),
                    precomputed_explanation: inv.evidence_summary || inv.description,
                    content_paragraphs: inv.content_paragraphs || [
                      inv.description,
                      inv.evidence_summary || "Investigative forensics cross-referenced primary sources, laboratory evidence, and public registry records.",
                      "Independent verification desks conclude the factual veracity according to accredited reporting standards."
                    ],
                  });
                }}
                className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs flex items-center gap-3 group cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >

                <img
                  src={inv.image_url}
                  alt={inv.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = resolveRealTimeNewsImage(inv.title, inv.category);
                  }}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-sans">
                    {inv.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">{inv.date}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

      </section>

      {/* Investigation Detail Modal */}
      {selectedInvestigation && (
        <ArticleDetailModal
          article={{
            id: selectedInvestigation.id,
            title: selectedInvestigation.title,
            thumbnail_url: selectedInvestigation.image_url,
            category: selectedInvestigation.category,
            author: "TruthLens Investigative Unit",
            published_at: selectedInvestigation.date,
            read_time_minutes: 4,
            summary: selectedInvestigation.description,
            verdict_context: selectedInvestigation.verdict,
            content: `INVESTIGATION DOSSIER\n\n${selectedInvestigation.description}\n\nEvidence Analysis:\n${selectedInvestigation.evidence_summary}\n\nOfficial Fact Verification:\nTruthLens cross-referenced technical metrics, official public agency archives, and digital media artifacts. The findings conclude that this viral claim lacks necessary factual backing or manipulates legitimate data out of context.`,
          }}
          onClose={() => setSelectedInvestigation(null)}
        />
      )}

      {/* Latest News Reader & Fact-Check Modal Window */}
      {selectedNewsArticle && (
        <NewsReaderFactCheckModal
          article={selectedNewsArticle}
          onClose={() => setSelectedNewsArticle(null)}
          onDeepVerify={(art) => {
            setSelectedNewsArticle(null);
            const hasValidUrl = art.link && art.link.startsWith("http");
            if (hasValidUrl) {
              setActiveTab("url");
              setInputValue(art.link);
              triggerVerification("url", art.link, art.title);
            } else {
              setActiveTab("text");
              setInputValue(art.title);
              triggerVerification("text", art.title, art.title);
            }
          }}
        />
      )}

    </div>
  );
}
