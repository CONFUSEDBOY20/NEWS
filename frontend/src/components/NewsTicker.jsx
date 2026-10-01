import React, { useEffect, useState, useRef } from "react";
import { fetchTrendingTicker } from "../services/newsService";
import { useApp } from "../context/AppContext";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

export function NewsTicker() {
  const [headlines, setHeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { setInputPreload, setActiveView, setVerificationResult } = useApp();
  const tickerContainerRef = useRef(null);

  useEffect(() => {
    loadTicker();
    const interval = setInterval(loadTicker, 60000); // 60s auto refresh
    return () => clearInterval(interval);
  }, []);

  async function loadTicker() {
    try {
      const items = await fetchTrendingTicker();
      if (items && items.length > 0) {
        setHeadlines(items);
        setError(false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const handleHeadlineClick = (item) => {
    const claim = item.title;
    setInputPreload({ type: "text", value: claim, autoStart: true });
    setVerificationResult(null);
    setActiveView("fact-check");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScrollLeft = () => {
    if (tickerContainerRef.current) {
      tickerContainerRef.current.scrollBy({ left: -250, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (tickerContainerRef.current) {
      tickerContainerRef.current.scrollBy({ left: 250, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full bg-white dark:bg-[#0B1120] border-y border-slate-200 dark:border-slate-800/80 py-2.5 px-4 sm:px-6 lg:px-8 transition-colors select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left Badge & Label */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-[11px] tracking-wide shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>LIVE</span>
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white hidden sm:inline">
            Trending Now :
          </span>
        </div>

        {/* Center Marquee / Ticker Row */}
        <div className="flex-1 overflow-hidden relative" ref={tickerContainerRef}>
          {loading ? (
            <div className="flex items-center gap-4 text-xs text-slate-400 py-0.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Updating live wire intelligence...</span>
            </div>
          ) : error && headlines.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Trending feed syncing.</span>
              <button onClick={loadTicker} className="text-blue-600 hover:underline">
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-hidden whitespace-nowrap">
              <div className="inline-flex items-center gap-6 animate-ticker hover:[animation-play-state:paused]">
                {headlines.concat(headlines).map((item, idx) => (
                  <div
                    key={`${item.title}-${idx}`}
                    className="inline-flex items-center gap-3 shrink-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                    <button
                      onClick={() => handleHeadlineClick(item)}
                      className="text-xs font-medium text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
                      title="Click to cross-examine headline"
                    >
                      {item.title}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleScrollLeft}
            className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title="Previous headline"
            aria-label="Previous headline"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleScrollRight}
            className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title="Next headline"
            aria-label="Next headline"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
