import React, { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../utils/translations";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("truthlens_lang") || "en");
  const [theme, setTheme] = useState(() => localStorage.getItem("truthlens_theme") || "dark");
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
  const [inputPreload, setInputPreload] = useState(null);

  // Admin State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => !!localStorage.getItem("truthlens_admin_token"));
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState(null);

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

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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

export function useApp() {
  return useContext(AppContext);
}
