import React, { useState } from "react";
import { ArrowRight, Newspaper, Search, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";

const suggestions = ["India headlines", "Technology news", "A viral claim"];

export function QuickSearchBar() {
  const {
    setActiveView,
    setInputPreload,
    setPendingNewsSearch,
    setVerificationError,
    setVerificationResult,
  } = useApp();
  const [query, setQuery] = useState("");

  const getValue = () => query.trim();

  const searchNews = () => {
    const value = getValue();
    if (!value) return;
    setPendingNewsSearch(value);
    setActiveView("live-news");
  };

  const verifyClaim = () => {
    const value = getValue();
    if (!value) return;
    const isUrl = /^https?:\/\//i.test(value);
    setVerificationError(null);
    setVerificationResult(null);
    setInputPreload({ type: isUrl ? "url" : "text", value, autoStart: true });
    setActiveView("fact-check");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Enter finds matching live stories. The verification action remains next
    // to the same input, so users can choose either job without retyping.
    searchNews();
  };

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-3" aria-label="Search and verify">
      <div className="max-w-7xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-sm p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <label className="relative flex-1 min-w-0">
            <span className="sr-only">Search news or enter a claim to verify</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search news or paste a headline / claim to verify..."
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-black/30 pl-10 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </label>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <button
              type="submit"
              disabled={!query.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              title="Find matching live news"
            >
              <Newspaper className="w-4 h-4" />
              <span>Find news</span>
            </button>
            <button
              type="button"
              onClick={verifyClaim}
              disabled={!query.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              title="Verify this claim or headline"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify</span>
              <ArrowRight className="hidden sm:block w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-medium text-slate-400">Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[10px] text-slate-600 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
