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
import { LiveDetectionView } from "./components/LiveDetectionView";
import { AdminModal } from "./components/AdminModal";
import { AdminDashboard } from "./components/AdminDashboard";
import { ShieldCheck, CheckCircle2, ArrowUpRight } from "lucide-react";

function MainContent() {
  const {
    activeView,
    setActiveView,
    isVerifying,
    verificationResult,
    isAdminLoggedIn,
    toastMessage,
    theme
  } = useApp();

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-200 relative selection:bg-emerald-500/20 selection:text-emerald-400 font-sans ${
      isDark ? "bg-[#090D16] text-slate-100" : "bg-[#F8FAFC] text-slate-900"
    }`}>

      <div className="relative z-10 flex-1 flex flex-col">
        {/* Full-width Website Header */}
        <Header />
        
        {/* Full-width Wire Ticker */}
        <NewsTicker />

        {/* Main Website Page Content */}
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

          {activeView === "live-detect" && <LiveDetectionView />}

          {activeView === "articles" && <FactArticlesView />}

          {activeView === "admin" && (
            isAdminLoggedIn ? <AdminDashboard /> : <FactCheckHero />
          )}
        </main>
      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium shadow-xl border border-slate-700 dark:border-slate-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* History Modal Dialog */}
      <HistorySidebar />

      {/* Admin Login Modal */}
      <AdminModal />

      {/* Full Website Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#070A11] py-12 relative z-10 text-xs text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Col 1: Brand & Mission */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">TruthLens</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                An open investigative web platform for automated multi-source news verification, media forensics, and claim analysis.
              </p>
              <div className="text-[11px] text-slate-400">
                Source-first verification · Real-time wire consensus
              </div>
            </div>

            {/* Col 2: Verification Tools */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Verification Tools
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setActiveView("fact-check")} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Article URL Fact-Check
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView("fact-check")} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Text Claim Cross-Examination
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView("fact-check")} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Image ELA & Forensic Audit
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView("live-detect")} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Live Misinformation Monitor
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Live News Coverage */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                News Coverage
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setActiveView("world-news")} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    World Wire Headlines
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView("india-news")} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    India National Wire
                  </button>
                </li>
                <li>
                  <button onClick={() => setActiveView("articles")} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    Fact Investigation Dossiers
                  </button>
                </li>
                <li>
                  <a href="http://127.0.0.1:8000/api/docs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    <span>REST API Documentation</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4: Standards & Transparency */}
            <div className="space-y-2.5">
              <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                Editorial Transparency
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                TruthLens synthesizes evidence from indexed news registries and official wire records. AI-assisted verdicts are probabilistic and should be reviewed alongside cited primary evidence.
              </p>
              <div className="text-[11px] text-slate-400">
                Data stored locally · No user tracking
              </div>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} TruthLens Media Intelligence. All rights reserved.</p>
            <p className="text-slate-400 text-center sm:text-right">
              Built with React 19, FastAPI, and open evidence datasets.
            </p>
          </div>
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
