import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Header } from "./components/Header";
import { NewsTicker } from "./components/NewsTicker";
import { FactCheckHero } from "./components/FactCheckHero";
import { FactCheckProgress } from "./components/FactCheckProgress";
import { FactCheckResult } from "./components/FactCheckResult";
import { HistorySidebar } from "./components/HistorySidebar";
import { WorldNewsView } from "./components/WorldNewsView";
import { IndiaNewsView } from "./components/IndiaNewsView";
import { FactArticlesView } from "./components/FactArticlesView";
import { AdminModal } from "./components/AdminModal";
import { AdminDashboard } from "./components/AdminDashboard";
import { ShieldCheck, CheckCircle, Info } from "lucide-react";

function MainContent() {
  const {
    activeView,
    isVerifying,
    verificationResult,
    isAdminLoggedIn,
    toastMessage,
    theme
  } = useApp();

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 relative selection:bg-indigo-500/30 selection:text-indigo-200 ${
      isDark ? "bg-[#08090E] text-slate-100" : "bg-[#F8FAFC] text-slate-900"
    }`}>
      
      {/* Apple / Linear Radial Ambient Aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[140px] transition-all duration-500 ${
          isDark ? "bg-indigo-500/10" : "bg-indigo-500/8"
        }`} />
        <div className={`absolute top-1/3 -left-32 w-[500px] h-[300px] rounded-full blur-[160px] transition-all duration-500 ${
          isDark ? "bg-emerald-500/5" : "bg-emerald-500/8"
        }`} />
        <div className={`absolute top-2/3 -right-32 w-[500px] h-[300px] rounded-full blur-[160px] transition-all duration-500 ${
          isDark ? "bg-cyan-500/5" : "bg-cyan-500/8"
        }`} />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Navigation Header */}
        <Header />
        
        {/* Breaking News Ticker */}
        <NewsTicker />

        {/* View Switcher */}
        <main className="flex-1 pb-16">
          {activeView === "fact-check" && (
            <>
              <FactCheckHero />
              {isVerifying && <FactCheckProgress />}
              {!isVerifying && verificationResult && <FactCheckResult />}
            </>
          )}

          {activeView === "world-news" && <WorldNewsView />}

          {activeView === "india-news" && <IndiaNewsView />}

          {activeView === "articles" && <FactArticlesView />}

          {activeView === "admin" && (
            isAdminLoggedIn ? <AdminDashboard /> : <FactCheckHero />
          )}
        </main>
      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0D101A] border border-indigo-500/30 text-indigo-300 text-xs font-mono shadow-2xl backdrop-blur-xl">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Slide-out History Drawer */}
      <HistorySidebar />

      {/* Admin Login Modal */}
      <AdminModal />

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.06] bg-black/40 backdrop-blur-md py-8 relative z-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-slate-300">TruthLens Intelligence Engine</span>
            <span>• 500+ Audited Wire Repositories</span>
          </div>
          <p className="text-center sm:text-right text-slate-500">
            Source-First Verification Architecture • Real-Time Forensic Consensus
          </p>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
