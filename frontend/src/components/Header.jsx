import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Moon,
  Sun,
  History,
  ChevronDown,
  X,
  ShieldCheck,
  SlidersHorizontal,
  Menu,
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
    setInputPreload,
    setVerificationResult,
    showToast,
  } = useApp();

  const [topicsOpen, setTopicsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const topicsRef = useRef(null);
  const searchInputRef = useRef(null);

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

  // Focus search input when modal opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (showToast) {
      showToast(nextTheme === "dark" ? "Dark Mode Enabled" : "Light Mode Enabled");
    }
  };

  const navLinks = [
    { id: "fact-check", label: "Fact Check" },
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setInputPreload({ type: "text", value: searchQuery.trim(), autoStart: true });
    setVerificationResult(null);
    setActiveView("fact-check");
    setSearchOpen(false);
    setSearchQuery("");
  };

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
            
            {/* TruthLens Logo with Magnifier / Blue Ring Lens */}
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              onClick={() => setActiveView("fact-check")}
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-blue-600 dark:border-blue-500 bg-white dark:bg-[#0B1120] shadow-xs group-hover:scale-105 transition-transform duration-150">
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-500 stroke-[2.5]" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
                Truth<span className="text-blue-600 dark:text-blue-500">Lens</span>
              </span>
            </div>

            {/* Desktop Navigation Links (with exact blue indicator bar) */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 h-16">
              {navLinks.map((tab) => {
                const isActive = activeView === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id)}
                    className={`relative h-full flex items-center px-3.5 text-sm font-semibold transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 dark:bg-blue-500 rounded-t-sm" />
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
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Search claims or articles"
              aria-label="Search"
            >
              <Search className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
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
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              title="Editorial Admin Suite"
              aria-label="Admin settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open mobile navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] px-4 py-3 space-y-1 animate-fadeIn">
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

      {/* Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Search className="w-4 h-4 text-blue-600" />
                <span>Search Claim or Fact-Check</span>
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter claim keyword or viral headline to search..."
                  className="w-full pl-3.5 pr-20 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Verify
                </button>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Quick search triggers multi-source verification instantly</span>
                <span>ESC to close</span>
              </div>
            </form>
          </div>
        </div>
      )}

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
