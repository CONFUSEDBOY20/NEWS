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
    { id: "fact-check", label: t.navHome, icon: ShieldCheck },
    { id: "world-news", label: t.navWorldNews, icon: Globe },
    { id: "india-news", label: t.navIndiaNews, icon: Compass },
    { id: "live-detect", label: t.navLiveDetect, icon: Radar },
    { id: "articles", label: t.navArticles, icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 w-full pt-3 pb-2 px-4 sm:px-6 lg:px-8 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel rounded-2xl px-4 py-2.5 shadow-2xl shadow-black/60 pointer-events-auto border border-white/[0.08] backdrop-blur-2xl">
        
        {/* Brand & Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group select-none"
          onClick={() => setActiveView("fact-check")}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1px] shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <div className="w-full h-full bg-[#0D101A] rounded-[11px] flex items-center justify-center group-hover:bg-[#121624] transition-colors">
                <ShieldCheck className="w-5 h-5 text-indigo-400 group-hover:text-emerald-400 transition-colors" />
              </div>
            </div>
            {/* Ambient status light */}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#08090E] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                {t.brandName}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-mono tracking-wider bg-white/[0.06] text-slate-300 border border-white/[0.08] rounded-md">
                PRO 2.6
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              {language === "hi" ? "उन्नत तथ्य सत्यापन प्रणाली" : "Intelligence & Media Verification"}
            </p>
          </div>
        </div>

        {/* Desktop Segmented Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.12] text-white font-semibold shadow-sm border border-white/[0.12]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Theme Toggle, History, Language, Admin */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-all duration-200 group cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Dark Mode"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400 group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          {/* History Drawer Trigger */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="relative p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-all duration-200 group"
            title={t.navHistory}
          >
            <History className="w-4 h-4 text-slate-400 group-hover:text-indigo-300 transition-colors" />
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-indigo-500 text-[9px] font-mono text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/50">
                {history.length}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === "en" ? "hi" : "en")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-all duration-200"
            title="Toggle Language (English / हिंदी)"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold">{language.toUpperCase()}</span>
          </button>

          {/* Admin Lock Button */}
          <button
            onClick={() => setShowAdminModal(true)}
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-amber-400 border border-white/[0.06] transition-all duration-200"
            title="Admin Suite"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/[0.03] text-slate-300 hover:text-white border border-white/[0.06]"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 glass-panel rounded-2xl p-3 border border-white/[0.08] shadow-2xl pointer-events-auto space-y-1">
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
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white/[0.12] text-white font-semibold border border-white/[0.12]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
