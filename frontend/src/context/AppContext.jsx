import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations } from "../utils/translations";
import { api } from "../services/api";
import { fetchLatestNews } from "../services/newsService";
import { isFirebaseConfigured, subscribeFactChecks, subscribeArticles } from "../services/firebaseClient";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("truthlens_lang") || "en");
  const [theme, setTheme] = useState(() => localStorage.getItem("truthlens_theme") || "light");
  const [activeView, setActiveView] = useState("fact-check"); // fact-check, world-news, india-news, articles, admin
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("truthlens_history") || "[]");
    } catch {
      return [];
    }
  });
  
  // Verification State
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStage, setVerificationStage] = useState(0);
  const [activeClaimText, setActiveClaimText] = useState("");
  const [streamingAnalysisText, setStreamingAnalysisText] = useState("");
  const [inputPreload, setInputPreload] = useState(null);

  // Live Connection & Telemetry State
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toISOString());
  const [communityArticles, setCommunityArticles] = useState([]);

  // Admin State (never trusted merely from localStorage existence)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState(null);

  // Validate admin token against backend on mount
  useEffect(() => {
    const token = localStorage.getItem("truthlens_admin_token");
    if (!token) {
      setIsAdminLoggedIn(false);
      return;
    }
    api.getAdminDashboard()
      .then(() => {
        setIsAdminLoggedIn(true);
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem("truthlens_admin_token");
          setIsAdminLoggedIn(false);
        }
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("truthlens_lang", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("truthlens_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [theme]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // 60-second background polling & tab visibility sync
  const refreshLiveTelemetry = useCallback(async (isManual = false) => {
    if (!isManual && typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    try {
      const [newsRes, articlesRes] = await Promise.allSettled([
        fetchLatestNews({ category: "All", fresh: true }),
        api.getArticles()
      ]);
      const anySuccess = newsRes.status === "fulfilled" || articlesRes.status === "fulfilled";
      if (anySuccess) {
        setIsLiveConnected(true);
        setLastUpdated(new Date().toISOString());
        if (articlesRes.status === "fulfilled" && Array.isArray(articlesRes.value)) {
          setCommunityArticles(articlesRes.value);
        }
        if (isManual) {
          showToast("Live telemetry and news feeds synchronized.");
        }
      } else {
        setIsLiveConnected(false);
        if (isManual) {
          showToast("Sync failed. Verification service unreachable.");
        }
      }
    } catch (err) {
      console.warn("Telemetry refresh error:", err);
      setIsLiveConnected(false);
      if (isManual) {
        showToast("Sync error. Please check network connectivity.");
      }
    }
  }, [showToast]);

  useEffect(() => {
    // Initial fetch on mount
    refreshLiveTelemetry(false);

    // Auto-polling interval: 60 seconds
    const interval = setInterval(() => {
      refreshLiveTelemetry(false);
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshLiveTelemetry(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshLiveTelemetry]);

  // Optional real-time Firestore listeners across browser tabs
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const unsubChecks = subscribeFactChecks((checks) => {
      if (checks && checks.length > 0) {
        setLastUpdated(new Date().toISOString());
        setIsLiveConnected(true);
      }
    });

    const unsubArticles = subscribeArticles((articles) => {
      if (articles && articles.length > 0) {
        setCommunityArticles(articles);
        setLastUpdated(new Date().toISOString());
        setIsLiveConnected(true);
      }
    });

    return () => {
      unsubChecks();
      unsubArticles();
    };
  }, []);

  const syncNow = () => {
    refreshLiveTelemetry(true);
  };

  const addToHistory = (result) => {
    const newEntry = {
      id: result.id,
      input: result.submitted_input,
      type: result.submission_type,
      verdict: result.verdict,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
      resultData: result
    };
    const updated = [newEntry, ...history.filter(h => h.id !== result.id)].slice(0, 30);
    setHistory(updated);
    localStorage.setItem("truthlens_history", JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("truthlens_history");
    showToast("Verification history cleared.");
  };

  const t = translations[language] || translations.en;

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        setTheme,
        activeView,
        setActiveView,
        history,
        addToHistory,
        clearHistory,
        verificationResult,
        setVerificationResult,
        isVerifying,
        setIsVerifying,
        verificationStage,
        setVerificationStage,
        activeClaimText,
        setActiveClaimText,
        streamingAnalysisText,
        setStreamingAnalysisText,
        isLiveConnected,
        setIsLiveConnected,
        lastUpdated,
        syncNow,
        communityArticles,
        inputPreload,
        setInputPreload,
        isAdminLoggedIn,
        setIsAdminLoggedIn,
        showAdminModal,
        setShowAdminModal,
        showHistoryDrawer,
        setShowHistoryDrawer,
        toastMessage,
        showToast,
        t
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  return useContext(AppContext);
}
