import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { Lock, X, ArrowRight, AlertCircle, ShieldCheck, KeyRound } from "lucide-react";

export function AdminModal() {
  const {
    showAdminModal,
    setShowAdminModal,
    isAdminLoggedIn,
    setIsAdminLoggedIn,
    setActiveView,
    showToast,
    t
  } = useApp();

  const [email, setEmail] = useState("admin@truthlens.ai");
  const [password, setPassword] = useState("TruthLens@2026Admin");
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
      showToast("Authenticated as Super Administrator.");
    } catch (err) {
      setError(err.message || "Invalid administrative credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fadeIn">
      <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
        
        {/* Close */}
        <button
          onClick={() => setShowAdminModal(false)}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            {t.adminLoginTitle}
          </h3>
          <p className="text-xs text-slate-400">
            Protected endpoint for raw verification indexing & system controls
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">Admin Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.adminEmailPlaceholder}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300">Security Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.adminPasswordPlaceholder}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? "Authenticating..." : t.btnLogin}</span>
          </button>
        </form>

        {/* Demo Credentials Hint */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400 text-center">
          <p className="text-emerald-400 font-bold mb-0.5">Demo Admin Key:</p>
          <p>admin@truthlens.ai • TruthLens@2026Admin</p>
        </div>

      </div>
    </div>
  );
}
