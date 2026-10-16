import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { TruthLensLogo } from "./TruthLensLogo";
import {
  Moon,
  Sun,
  History,
  ChevronDown,
  X,
  ShieldCheck,
  SlidersHorizontal,
  Menu,
  RefreshCw,
} from "lucide-react";

export function Header() {
  const {
    theme,
    setTheme,
    activeView,
    setActiveView,
    setShowAdminModal,
    setShowHistoryDrawer,
    history,
    showToast,
    isLiveConnected,
    lastUpdated,
    syncNow,
  } = useApp();

  const [topicsOpen, setTopicsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const topicsRef = useRef(null);

  // Close topics dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (topicsRef.current && !topicsRef.current.contains(event.target)) {
        setTopicsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (showToast) {
      showToast(nextTheme === "dark" ? "Dark Mode Enabled" : "Light Mode Enabled");
    }
  };

  const navLinks = [
    { id: "fact-check", label: "Fact Check" },
    { id: "live-news", label: "Live News" },
    { id: "world-news", label: "World News" },
    { id: "india-news", label: "India News" },
    { id: "articles", label: "Investigations" },
  ];

  const topicOptions = [
    { label: "Politics", cat: "Politics" },
    { label: "Technology & AI", cat: "Technology" },
    { label: "Health & Medicine", cat: "Health" },
    { label: "Climate & Environment", cat: "Environment" },
    { label: "Economy & Currency", cat: "Economy" },
    { label: "Viral Social Media", cat: "Social" },
  ];

  const handleTopicSelect = (_cat) => {
    setTopicsOpen(false);
    setActiveView("world-news");
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#0B1120] border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Brand + Navigation Items */}
          <div className="flex items-center gap-8 lg:gap-10">
            
            {/* TruthLens brand mark */}
            <div
              className="cursor-pointer select-none transition-transform duration-150 hover:scale-[1.03]"
              onClick={() => setActiveView("fact-check")}
            >
              <TruthLensLogo imageClassName="w-[78px] sm:w-[88px]" />
            </div>

            {/* Desktop Navigation Links (with exact blue indicator bar) */}
            <nav className="hidden xl:flex items-center space-x-1 lg:space-x-2 h-16">
              {navLinks.map((tab) => {
                const isActive = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`relative h-full flex items-center px-3.5 text-sm font-semibold tab-transition cursor-pointer ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 dark:bg-blue-500 rounded-t-sm animate-nav-indicator" />
                    )}
                  </button>
                );
              })}

              {/* Topics Dropdown */}
              <div className="relative h-full flex items-center" ref={topicsRef}>
                <button
                  type="button"
                  onClick={() => setTopicsOpen(!topicsOpen)}
                  className={`flex items-center gap-1 px-3.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                    topicsOpen
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>Topics</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${topicsOpen ? "rotate-180" : ""}`} />
                </button>

                {topicsOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50 animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Explore Topics
                    </div>
                    {topicOptions.map((topic) => (
                      <button
                        key={topic.cat}
                        onClick={() => handleTopicSelect(topic.cat)}
                        className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {topic.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* About Button */}
              <button
                type="button"
                onClick={() => setAboutOpen(true)}
                className="h-full flex items-center px-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors duration-150 cursor-pointer"
              >
                About
              </button>
            </nav>

          </div>

          {/* Right: Search, Dark Mode, History */}
          <div className="flex items-center gap-1 sm:gap-3">
            
            {/* Live Connection & Sync Button */}
            <button
              type="button"
              onClick={syncNow}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors cursor-pointer ${
                isLiveConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
              }`}
              title={`Last synced: ${lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "Never"}. Click to Sync Now.`}
            >
              <span className={`w-2 h-2 rounded-full ${isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="hidden md:inline">{isLiveConnected ? "Live Connected" : "Offline"}</span>
              <RefreshCw className="w-3 h-3 hover:rotate-180 transition-transform" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200" />
              ) : (
                <Moon className="w-4 h-4 stroke-[2] transition-transform duration-200" />
              )}
            </button>

            {/* History Button (Clock icon + History + counter) */}
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(true)}
              className="inline-flex items-center gap-1.5 px-1.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              title="View verification history"
            >
              <History className="w-4 h-4 stroke-[2]" />
              <span className="hidden sm:inline">History</span>
              {history.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold font-mono">
                  {history.length}
                </span>
              )}
            </button>

            {/* Admin discrete entry */}
            <button
              type="button"
              onClick={() => setShowAdminModal(true)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Editorial Admin Suite"
              aria-label="Admin settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-1.5 sm:p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open mobile navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] px-4 py-3 space-y-1 animate-fadeIn">
            {navLinks.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveView(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  activeView === tab.id
                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTopicsOpen((open) => !open)}
              className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-expanded={topicsOpen}
            >
              Topics <ChevronDown className={`w-4 h-4 transition-transform ${topicsOpen ? "rotate-180" : ""}`} />
            </button>
            {topicsOpen && (
              <div className="ml-3 pl-3 border-l border-slate-200 dark:border-slate-700">
                {topicOptions.map((topic) => (
                  <button
                    key={topic.cat}
                    type="button"
                    onClick={() => {
                      handleTopicSelect(topic.cat);
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setAboutOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              About TruthLens
            </button>
          </div>
        )}
      </header>

      {/* About TruthLens Modal */}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">About TruthLens</h3>
                  <p className="text-[11px] text-slate-500">Non-partisan automated media intelligence</p>
                </div>
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>TruthLens</strong> is an editorial fact-checking and media intelligence platform dedicated to countering digital disinformation, viral hoaxes, and manipulated content before it causes harm.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="font-semibold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider">
                  Our Verification Methodology
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>Cross-checks statements against official government gazettes, PIB, and multilateral registries.</li>
                  <li>Corroborates claims with international verified news wires (Reuters, AP, AFP, BBC).</li>
                  <li>Applies multi-level Error Level Analysis (ELA) for image and media manipulation checks.</li>
                  <li>Provides probabilistic confidence scores with cited primary evidence sources.</li>
                </ul>
              </div>
              <p className="text-[11px] text-slate-400">
                TruthLens does not accept political contributions or partisan funding. All algorithms and evidence citation pipelines follow strict transparent editorial standards.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setAboutOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
