import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  ShieldCheck,
  Globe,
  Compass,
  Radar,
  FileText,
  History,
  Lock,
  Sun,
  Moon,
  Languages,
  Menu,
  X,
} from "lucide-react";

export function Header() {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    activeView,
    setActiveView,
    setShowAdminModal,
    setShowHistoryDrawer,
    history,
    t,
    showToast
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (showToast) {
      showToast(nextTheme === "dark" ? "Dark Mode Enabled" : "Light Mode Enabled");
    }
  };

  const navItems = [
    { id: "fact-check", label: t.navHome || "Fact Check", icon: ShieldCheck },
    { id: "world-news", label: t.navWorldNews || "World News", icon: Globe },
    { id: "india-news", label: t.navIndiaNews || "India News", icon: Compass },
    { id: "live-detect", label: t.navLiveDetect || "Live Monitor", icon: Radar },
    { id: "articles", label: t.navArticles || "Investigations", icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#090D16]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo with subtle hover and pulsing shield */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none group transition-transform duration-200 hover:scale-[1.02]"
          onClick={() => setActiveView("fact-check")}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 dark:text-emerald-400 relative overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.35)] group-hover:border-emerald-500/50">
            <span className="absolute inset-0 rounded-lg animate-soft-pulse bg-emerald-500/5 pointer-events-none" />
            <ShieldCheck className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white font-sans transition-colors duration-200 group-hover:text-emerald-500 dark:group-hover:text-emerald-400">
                Truth<span className="text-emerald-500 dark:text-emerald-400">Lens</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-soft-pulse" />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden lg:block -mt-0.5">
              News Fact-Checking & Media Intelligence
            </p>
          </div>
        </div>

        {/* Website Desktop Navigation Links with Smooth Active Transitions */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "text-slate-900 dark:text-white font-semibold bg-slate-100/80 dark:bg-white/[0.08]"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors duration-200 ${isActive ? "text-emerald-500 dark:text-emerald-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-emerald-500 rounded-full transition-all duration-200" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Controls & Utilities with 150-250ms Hover & Press */}
        <div className="flex items-center gap-2">
          
          {/* History Modal Trigger */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="btn-press flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all duration-200 border border-slate-200 dark:border-white/[0.08] hover:-translate-y-0.5 active:translate-y-0"
            title={t.navHistory || "History"}
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.navHistory || "History"}</span>
            {history.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold font-mono animate-soft-pulse">
                {history.length}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            className="btn-press flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            title="Toggle Language"
          >
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Dark / Light Mode */}
          <button
            onClick={toggleTheme}
            className="btn-press p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform duration-300 hover:rotate-45" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
            )}
          </button>

          {/* Admin Suite */}
          <button
            onClick={() => setShowAdminModal(true)}
            className="btn-press p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            title="Admin Suite"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn-press md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] transition-all duration-200"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Responsive Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090D16] px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-500" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
