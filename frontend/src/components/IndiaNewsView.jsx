import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";
import { Compass, Search, ExternalLink, ShieldCheck, Clock, Loader2, ArrowUpRight } from "lucide-react";

export function IndiaNewsView() {
  const { setInputPreload, setActiveView, setVerificationResult, t } = useApp();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["All", "Science", "Economy", "Technology", "Climate", "Politics"];

  useEffect(() => {
    loadNews();
  }, [category]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const data = await api.getIndiaNews(category);
      setArticles(data.articles || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadNews();
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchNews(searchQuery.trim());
      setArticles(data.articles || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyArticle = (art) => {
    setInputPreload({ type: "url", value: art.url });
    setVerificationResult(null);
    setActiveView("fact-check");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>{t.newsHeaderIndia}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            National & Regional News Wire
          </h2>
        </div>

        {/* Minimalist Search Bar */}
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.newsSearchPlaceholder}
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/20 font-normal transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
              category === cat
                ? "bg-white/[0.12] text-white font-semibold border border-white/[0.12] shadow-sm"
                : "bg-white/[0.02] text-slate-400 hover:text-slate-200 border border-white/[0.04] hover:bg-white/[0.06]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs font-mono">Fetching national news repository...</span>
        </div>
      )}

      {/* Article Cards Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((art) => (
            <article
              key={art.id}
              className="glass-card rounded-3xl p-5 border border-white/[0.06] flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                
                {/* Meta Row */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-cyan-300 border border-white/[0.06] font-semibold">
                    {art.source_name}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {art.published_at?.slice(0, 10)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-200 transition-colors leading-snug line-clamp-2">
                  {art.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 font-normal">
                  {art.summary}
                </p>

              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <a
                  href={art.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <span>{t.btnReadSource}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => handleVerifyArticle(art)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/20 transition-all group-hover:border-cyan-500/40"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.btnVerifyNow}</span>
                </button>
              </div>

            </article>
          ))}
        </div>
      )}

    </div>
  );
}
