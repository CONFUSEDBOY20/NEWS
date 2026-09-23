import React from "react";
import { X, Clock, User, Tag, ShieldCheck, Share2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export function ArticleDetailModal({ article, onClose }) {
  const { showToast } = useApp();
  if (!article) return null;

  const copyArticleLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Investigation article link copied.");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 md:p-10 flex items-center justify-center animate-fadeIn">
      <div className="w-full max-w-3xl glass-panel rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Thumbnail Image */}
        {article.thumbnail_url && (
          <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden border border-slate-800">
            <img
              src={article.thumbnail_url}
              alt={article.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-xs font-mono text-emerald-400 font-bold border border-slate-700">
              {article.category}
            </div>
          </div>
        )}

        {/* Title and Meta */}
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            {article.title}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              {article.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(article.published_at).toLocaleDateString()} • {article.read_time_minutes} min read
            </span>
            {article.verdict_context && (
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                Investigates: {article.verdict_context} Claim
              </span>
            )}
          </div>
        </div>

        {/* Summary Lead */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm italic leading-relaxed">
          {article.summary}
        </div>

        {/* Article Body */}
        <div className="prose prose-invert max-w-none text-sm text-slate-300 space-y-4 whitespace-pre-line leading-relaxed">
          {article.content}
        </div>

        {/* Tags and Share */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {article.tags?.map((t, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 text-xs font-mono border border-slate-800"
              >
                #{t}
              </span>
            ))}
          </div>

          <button
            onClick={copyArticleLink}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Investigation</span>
          </button>
        </div>

      </div>
    </div>
  );
}
