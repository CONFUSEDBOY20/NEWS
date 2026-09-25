import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";
import { ArticleDetailModal } from "./ArticleDetailModal";
import { FileText, Clock, User, ArrowRight, Loader2 } from "lucide-react";

export function FactArticlesView() {
  const { t } = useApp();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await api.getArticles();
      setArticles(data || []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-1">
          <FileText className="w-4 h-4" />
          <span>{t.navArticles || "Fact Investigations"}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-sans">
          Investigative Fact Dossiers
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Journalistic breakdowns examining viral disinformation campaigns, manipulated media cases, and forensic findings.
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-slate-400">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          <span className="text-xs">Loading dossiers...</span>
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-24 text-slate-400 text-sm">
          {t.noData || "No investigation articles available."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((art) => (
            <div
              key={art.id}
              onClick={() => setSelectedArticle(art)}
              className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <img
                    src={art.thumbnail_url || "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80"}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-[10px] font-mono text-emerald-400 font-medium">
                    {art.category}
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <User className="w-3 h-3 text-emerald-500" />
                      {art.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {art.read_time_minutes} min read
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {art.summary}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 pt-0 border-t border-slate-200/60 dark:border-white/[0.06] mt-2 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Read Full Investigation</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedArticle && (
        <ArticleDetailModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

    </div>
  );
}
