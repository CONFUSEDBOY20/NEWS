import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { ShieldCheck, Flame, Radio, ArrowUpRight } from "lucide-react";
import { useApp } from "../context/AppContext";

export function NewsTicker() {
  const [headlines, setHeadlines] = useState([]);
  const { setInputPreload, setActiveView, setVerificationResult } = useApp();

  useEffect(() => {
    async function loadTicker() {
      try {
        const [world, india] = await Promise.allSettled([
          api.getWorldNews("All"),
          api.getIndiaNews("All")
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
  }, []);

  if (!headlines.length) return null;

  const handleHeadlineClick = (item) => {
    setInputPreload({ type: "url", value: item.url });
    setVerificationResult(null);
    setActiveView("fact-check");
  };

  return (
    <div className="w-full bg-black/30 border-y border-white/[0.05] text-xs text-slate-300 overflow-hidden py-1.5 px-4 sm:px-8 flex items-center relative z-20 backdrop-blur-md">
      
      {/* Live Badge */}
      <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold px-2.5 py-1 rounded-lg shrink-0 uppercase tracking-wider text-[10px] select-none">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
        </span>
        <span>RADAR FEED</span>
      </div>

      {/* Marquee with fade gradients */}
      <div className="overflow-hidden whitespace-nowrap ml-4 flex-1 relative mask-linear">
        <div className="inline-flex gap-8 animate-ticker hover:[animation-play-state:paused] cursor-pointer">
          {headlines.concat(headlines).map((art, idx) => (
            <button
              key={`${art.id}-${idx}`}
              onClick={() => handleHeadlineClick(art)}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
            >
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06] group-hover:border-indigo-500/30 group-hover:text-indigo-300 transition-colors">
                {art.source_name}
              </span>
              <span className="text-xs group-hover:underline underline-offset-2">
                {art.title}
              </span>
              <span className="text-slate-700 font-mono">•</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
