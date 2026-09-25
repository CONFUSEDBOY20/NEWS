import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";

export function NewsTicker() {
  const [headlines, setHeadlines] = useState([]);
  const { setInputPreload, setActiveView, setVerificationResult } = useApp();

  useEffect(() => {
    async function loadTicker() {
      try {
        const data = await api.getLiveTicker();
        if (data?.articles?.length) {
          setHeadlines(data.articles);
          return;
        }
      } catch {
        // Fall through to split feeds
      }
      try {
        const [world, india] = await Promise.allSettled([
          api.getWorldNews("All"),
          api.getIndiaNews("All"),
        ]);
        const list = [];
        if (world.status === "fulfilled" && world.value?.articles) {
          list.push(...world.value.articles.slice(0, 4));
        }
        if (india.status === "fulfilled" && india.value?.articles) {
          list.push(...india.value.articles.slice(0, 4));
        }
        setHeadlines(list);
      } catch {
        // Silent fallback
      }
    }
    loadTicker();
    const timer = setInterval(loadTicker, 45000);
    return () => clearInterval(timer);
  }, []);

  if (!headlines.length) return null;

  const handleHeadlineClick = (item) => {
    const claim = [item.title, item.description || item.summary].filter(Boolean).join(". ");
    setInputPreload({ type: "text", value: claim, autoStart: true });
    setVerificationResult(null);
    setActiveView("fact-check");
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-[#070A11] border-b border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 py-2 px-4 sm:px-6 lg:px-8 flex items-center relative z-20">
      <div className="max-w-7xl mx-auto w-full flex items-center">
        {/* Pulsing LIVE indicator */}
        <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] shrink-0 select-none mr-3 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="tracking-wide">LIVE WIRE</span>
        </div>

        {/* Smooth continuous ticker with edge fade masks */}
        <div className="overflow-hidden whitespace-nowrap flex-1 relative [mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]">
          <div className="inline-flex gap-8 animate-ticker hover:[animation-play-state:paused] cursor-pointer">
            {headlines.concat(headlines).map((art, idx) => (
              <button
                key={`${art.id}-${idx}`}
                onClick={() => handleHeadlineClick(art)}
                className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-150 group"
              >
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                  {art.source_name}
                </span>
                <span className="text-xs group-hover:underline underline-offset-2 transition-all">
                  {art.title}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
