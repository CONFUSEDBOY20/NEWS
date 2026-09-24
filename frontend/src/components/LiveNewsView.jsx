import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";
import { Search, ShieldCheck, Clock, Loader2, ArrowUpRight, RefreshCw, Radio } from "lucide-react";

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

export function LiveNewsView({ region = "world" }) {
  const isWorld = region === "world";
  const { setInputPreload, setActiveView, setVerificationResult, t } = useApp();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncedAt, setSyncedAt] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const searchActive = useRef(false);

  const categories = isWorld
    ? ["All", "Politics", "Technology", "Health", "Economy", "Climate", "Science"]
    : ["All", "Politics", "Science", "Economy", "Technology", "Climate", "Health"];

  const theme = isWorld
    ? {
        label: "text-indigo-400",
        focus: "focus:border-indigo-500/60 focus:ring-indigo-500/20",
        spin: "text-indigo-400",
        chip: "text-indigo-300",
        hoverTitle: "group-hover:text-indigo-200",
        btn: "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/20 group-hover:border-indigo-500/40",
      }
    : {
        label: "text-cyan-400",
        focus: "focus:border-cyan-500/60 focus:ring-cyan-500/20",
        spin: "text-cyan-400",
        chip: "text-cyan-300",
        hoverTitle: "group-hover:text-cyan-200",
        btn: "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/20 group-hover:border-cyan-500/40",
      };

  useEffect(() => {
    searchActive.current = false;
    loadNews(true, false);
    const timer = setInterval(() => {
      if (!searchActive.current) loadNews(false, false);
    }, 45000);
    return () => clearInterval(timer);
  }, [category, region]);

  const loadNews = async (showSpinner, fresh) => {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const data = isWorld
        ? await api.getWorldNews(category, fresh)
        : await api.getIndiaNews(category, fresh);
      setArticles(data.articles || []);
      setSyncedAt(data.synced_at || new Date().toISOString());
      setIsLive(data.is_live !== false);
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      searchActive.current = false;
      loadNews(true, false);
      return;
    }
    searchActive.current = true;
    setLoading(true);
    try {
      const data = await api.searchNews(searchQuery.trim());
      setArticles(data.articles || []);
      setSyncedAt(data.synced_at || new Date().toISOString());
      setIsLive(data.is_live !== false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyArticle = (art) => {
    const claim = [art.title, art.description || art.summary].filter(Boolean).join(". ");
    setInputPreload({ type: "text", value: claim, autoStart: true });
    setVerificationResult(null);
    setActiveView("fact-check");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <div className={`flex items-center gap-2 ${theme.label} text-xs font-mono font-semibold tracking-wider uppercase mb-1`}>
            <Radio className="w-3.5 h-3.5" />
            <span>{isWorld ? t.newsHeaderWorld : t.newsHeaderIndia}</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border ${
              isLive
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}>
              <span className="relative flex h-1.5 w-1.5">
                {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isLive ? "bg-emerald-400" : "bg-amber-400"}`} />
              </span>
              {isLive ? "LIVE" : "CACHED"}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isWorld ? "Realtime World News Checker" : "Realtime India News Checker"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            {syncedAt ? `Updated ${relativeTime(syncedAt)} • headlines auto-refresh every 45s` : "Connecting to live wires…"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.newsSearchPlaceholder}
              className={`w-full bg-black/40 border border-white/[0.08] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${theme.focus} font-normal transition-all`}
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          </form>
          <button
            type="button"
            onClick={() => {
              searchActive.current = false;
              loadNews(false, true);
            }}
            className="shrink-0 p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/20 transition-colors"
            title="Refresh live feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              searchActive.current = false;
              setSearchQuery("");
              setCategory(cat);
            }}
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

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 className={`w-6 h-6 animate-spin ${theme.spin}`} />
          <span className="text-xs font-mono">Pulling live headlines…</span>
        </div>
      )}

      {!loading && articles.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-16">No live headlines matched this filter.</p>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((art) => (
            <article
              key={art.id}
              className="glass-card rounded-3xl p-5 border border-white/[0.06] flex flex-col justify-between group space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className={`px-2 py-0.5 rounded-md bg-white/[0.04] ${theme.chip} border border-white/[0.06] font-semibold`}>
                    {art.source_name}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {relativeTime(art.published_at)}
                  </span>
                </div>
                <h3 className={`text-sm sm:text-base font-bold text-white ${theme.hoverTitle} transition-colors leading-snug line-clamp-2`}>
                  {art.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 font-normal">
                  {art.description || art.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                <a
                  href={art.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <span>{t.btnReadSource || "Read source"}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleVerifyArticle(art)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${theme.btn}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t.btnVerifyThisNews || t.btnVerifyNow || "Check now"}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
