import React, { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";
import {
  Search,
  Clock,
  Loader2,
  RefreshCw,
  Radio,
  Globe,
  Terminal,
  FlaskConical,
  Heart,
  BarChart3,
  Leaf,
  Dumbbell,
  Film,
  ArrowRight,
} from "lucide-react";

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
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <Radio className="w-3.5 h-3.5" />
            <span>{isWorld ? t.newsHeaderWorld || "World Wire" : t.newsHeaderIndia || "India Wire"}</span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] ${
              isLive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {isLive ? "LIVE" : "CACHED"}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
            {isWorld ? "World News Coverage" : "India News Coverage"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {syncedAt ? `Updated ${relativeTime(syncedAt)} • headlines auto-refresh every 45s` : "Connecting to wire services..."}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.newsSearchPlaceholder || "Search headlines..."}
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] rounded-xl py-2 pl-9 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-sans transition-all"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <button
            type="button"
            onClick={() => {
              searchActive.current = false;
              loadNews(false, true);
            }}
            className="shrink-0 p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              searchActive.current = false;
              setSearchQuery("");
              setCategory(cat);
            }}
            className={`btn-press px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
              category === cat
                ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20"
                : "bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/60 dark:border-white/[0.04]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Elegant Skeleton Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="rounded-2xl overflow-hidden bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="h-40 w-full skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-20 rounded skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
                  <div className="h-4 w-5/6 rounded skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
                  <div className="h-3 w-full rounded skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
                </div>
              </div>
              <div className="p-4 pt-1 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between">
                <div className="h-3 w-16 rounded skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
                <div className="h-3 w-14 rounded skeleton-shimmer bg-slate-200/60 dark:bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && articles.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-16">No headlines found matching this filter.</p>
      )}

      {/* Articles Grid with Images */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {articles.map((art) => {
            const cat = art.category || "World";
            const badgeCfg = categoryBadgeConfig[cat] || categoryBadgeConfig.Default;
            const CategoryIcon = badgeCfg.icon;
            const imageUrl = art.url_to_image || categoryImages[cat] || categoryImages.World;

            return (
              <article
                key={art.id}
                className="rounded-2xl overflow-hidden bg-white dark:bg-[#111624] border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-lg transition-all duration-200 hover-lift flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail Image with Badges */}
                  <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                    <img
                      src={imageUrl}
                      alt={art.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Category Badge */}
                    <div className="absolute top-2.5 left-2.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white shadow-sm ${badgeCfg.bg}`}>
                        <CategoryIcon className="w-3 h-3" />
                        <span>{badgeCfg.label}</span>
                      </span>
                    </div>

                    {/* Time Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-white/90 bg-black/60 backdrop-blur-md">
                        {relativeTime(art.published_at)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{art.source_name}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug line-clamp-2">
                      {art.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {art.description || art.summary}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 pt-1 flex items-center justify-between border-t border-slate-100 dark:border-white/[0.04]">
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  >
                    Read source
                  </a>

                  <button
                    onClick={() => handleVerifyArticle(art)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    <span>Verify</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
