import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { Lock, X, AlertCircle, KeyRound } from "lucide-react";

export function AdminModal() {
  const {
    showAdminModal,
    setShowAdminModal,
    setIsAdminLoggedIn,
    setActiveView,
    showToast,
    t
  } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!showAdminModal) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.adminLogin(email.trim(), password);
      localStorage.setItem("truthlens_admin_token", data.access_token);
      setIsAdminLoggedIn(true);
      setShowAdminModal(false);
      setActiveView("admin");
      showToast("Authenticated as Administrator.");
    } catch (err) {
      setError(err.message || "Invalid administrative credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center animate-fadeIn">
      <div className="w-full max-w-sm glass-panel rounded-2xl border border-slate-200 dark:border-white/[0.1] p-6 space-y-5 shadow-2xl relative bg-white dark:bg-[#0D121E]">
        
        {/* Close */}
        <button
          onClick={() => setShowAdminModal(false)}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight font-sans">
            {t.adminLoginTitle || "Admin Authentication"}
          </h3>
          <p className="text-xs text-slate-500">
            Sign in to manage system controls & verified databases
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.adminEmailPlaceholder || "admin@example.com"}
              required
              autoFocus
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.1] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.1] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer mt-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{loading ? "Authenticating..." : (t.btnLogin || "Sign In")}</span>
          </button>
        </form>

        {/* Security Notice */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.06] text-[11px] text-slate-500 text-center">
          <p>Protected route. Configure administrative access in <code className="text-slate-700 dark:text-slate-300">.env</code>.</p>
        </div>

      </div>
    </div>
  );
}
