import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";
import {
  LayoutDashboard,
  Database,
  FileText,
  Activity,
  Settings,
  LogOut,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Save,
  X,
  Loader2,
  Sliders,
  TrendingUp,
  BarChart2
} from "lucide-react";

export function AdminDashboard() {
  const { setIsAdminLoggedIn, setActiveView, showToast, t } = useApp();
  const [activeTab, setActiveTab] = useState("overview"); // overview, raw-data, articles, logs, settings
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Raw Data State
  const [rawData, setRawData] = useState([]);
  const [rawSearch, setRawSearch] = useState("");
  const [rawCategory, setRawCategory] = useState("All");
  const [rawVerdict, setRawVerdict] = useState("All");
  const [editingRecord, setEditingRecord] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Logs & Settings State
  const [logs, setLogs] = useState([]);
  const [settingsData, setSettingsData] = useState(null);

  // Articles State
  const [articles, setArticles] = useState([]);
  const [editingArticle, setEditingArticle] = useState(null);
  const [showArticleModal, setShowArticleModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, rawRes, logsRes, setsRes, artsRes] = await Promise.allSettled([
        api.getAdminDashboard(),
        api.getRawData(),
        api.getAdminLogs(),
        api.getAdminSettings(),
        api.getArticles()
      ]);

      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (rawRes.status === "fulfilled") setRawData(rawRes.value || []);
      if (logsRes.status === "fulfilled") setLogs(logsRes.value || []);
      if (setsRes.status === "fulfilled") setSettingsData(setsRes.value || {});
      if (artsRes.status === "fulfilled") setArticles(artsRes.value || []);
    } catch {
      showToast("Error loading admin records.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("truthlens_admin_token");
    setIsAdminLoggedIn(false);
    setActiveView("fact-check");
    showToast("Signed out of admin portal.");
  };

  // Raw Data Actions
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord.id && rawData.some(r => r.id === editingRecord.id)) {
        await api.updateRawData(editingRecord.id, editingRecord);
        showToast("Raw fact record updated successfully.");
      } else {
        await api.createRawData(editingRecord);
        showToast("New raw fact record indexed successfully.");
      }
      setShowRecordModal(false);
      setEditingRecord(null);
      // Reload raw data
      const updated = await api.getRawData();
      setRawData(updated || []);
      // Reload logs
      const updatedLogs = await api.getAdminLogs();
      setLogs(updatedLogs || []);
    } catch (err) {
      showToast(err.message || "Failed to save record.");
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm("Are you sure you want to delete this raw fact check record?")) return;
    try {
      await api.deleteRawData(id);
      setRawData(rawData.filter(r => r.id !== id));
      showToast("Record deleted from repository.");
    } catch (err) {
      showToast(err.message || "Failed to delete record.");
    }
  };

  const handleExportCsv = () => {
    window.open("http://localhost:8000/api/admin/raw-data/export/csv", "_blank");
  };

  // Filtered raw data
  const filteredRawData = rawData.filter(item => {
    const matchesCat = rawCategory === "All" || item.category?.toLowerCase() === rawCategory.toLowerCase();
    const matchesVer = rawVerdict === "All" || item.verdict?.toLowerCase() === rawVerdict.toLowerCase();
    const matchesSearch = !rawSearch || 
      item.title?.toLowerCase().includes(rawSearch.toLowerCase()) ||
      item.claim?.toLowerCase().includes(rawSearch.toLowerCase()) ||
      item.source?.toLowerCase().includes(rawSearch.toLowerCase());
    return matchesCat && matchesVer && matchesSearch;
  });

  const categoriesList = ["All", "Health", "Economy", "Science", "Technology", "Politics", "Climate"];
  const verdictsList = ["All", "TRUE", "MOSTLY TRUE", "FALSE", "MISLEADING", "UNVERIFIED"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Administration Suite</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t.adminPortalTitle}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SUPER ADMIN ACTIVE</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.btnLogout}</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {[
          { id: "overview", label: t.tabOverview, icon: LayoutDashboard },
          { id: "raw-data", label: t.tabRawData, icon: Database },
          { id: "articles", label: t.tabFactArticles, icon: FileText },
          { id: "logs", label: t.tabLogs, icon: Activity },
          { id: "settings", label: t.tabSettings, icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === "overview" && stats && (
            <div className="space-y-8">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400">{t.statTotalChecks}</span>
                  <p className="text-2xl font-black text-white">{stats.total_fact_checks}</p>
                  <span className="text-[10px] text-emerald-400 font-mono">+18% this week</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400">{t.statTodayChecks}</span>
                  <p className="text-2xl font-black text-cyan-400">{stats.today_checks}</p>
                  <span className="text-[10px] text-slate-500 font-mono">Live Session</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400">{t.statFalseClaims}</span>
                  <p className="text-2xl font-black text-rose-400">{stats.false_claims_detected}</p>
                  <span className="text-[10px] text-rose-400/80 font-mono">Flagged & refuted</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400">{t.statVerifiedClaims}</span>
                  <p className="text-2xl font-black text-emerald-400">{stats.verified_claims}</p>
                  <span className="text-[10px] text-emerald-400/80 font-mono">Corroborated</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400">{t.statRawRecords}</span>
                  <p className="text-2xl font-black text-amber-400">{stats.raw_data_records}</p>
                  <span className="text-[10px] text-amber-400/80 font-mono">Database Index</span>
                </div>
                <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-mono text-slate-400">{t.statNewsIndexed}</span>
                  <p className="text-2xl font-black text-purple-400">{stats.news_records_indexed}</p>
                  <span className="text-[10px] text-purple-400/80 font-mono">Wire Sources</span>
                </div>
              </div>

              {/* Volume & Verdict Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Daily Volume Bar Chart */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>7-Day Fact-Check Verification Volume</span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-3 h-44 pt-6">
                    {stats.daily_volume?.map((dv, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1 h-32">
                          <div
                            className="w-full max-w-[18px] bg-emerald-500 rounded-t-md transition-all"
                            style={{ height: `${Math.min(100, (dv.checks / 30) * 100)}%` }}
                            title={`Total: ${dv.checks}`}
                          />
                          <div
                            className="w-full max-w-[18px] bg-rose-500/80 rounded-t-md transition-all"
                            style={{ height: `${Math.min(100, (dv.flagged / 30) * 100)}%` }}
                            title={`Flagged: ${dv.flagged}`}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{dv.date}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-6 pt-2 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-emerald-500" />
                      <span>Total Checks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded bg-rose-500" />
                      <span>Flagged Misleading</span>
                    </div>
                  </div>
                </div>

                {/* Verdict Distribution Matrix */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300">
                    <BarChart2 className="w-4 h-4 text-cyan-400" />
                    <span>Verdict Classification Distribution</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {Object.entries(stats.verdict_distribution || {}).map(([v, count]) => (
                      <div key={v} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300">{v}</span>
                          <span className="text-slate-400">{count} occurrences</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              v === "TRUE" ? "bg-emerald-500" :
                              v === "FALSE" ? "bg-rose-500" :
                              v === "MISLEADING" ? "bg-orange-500" :
                              "bg-cyan-500"
                            }`}
                            style={{ width: `${Math.min(100, (count / 80) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: RAW DATA CRUD */}
          {activeTab === "raw-data" && (
            <div className="space-y-6">
              
              {/* Controls Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                
                {/* Search & Filters */}
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={rawSearch}
                      onChange={(e) => setRawSearch(e.target.value)}
                      placeholder={t.searchRawPlaceholder}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  </div>

                  <select
                    value={rawCategory}
                    onChange={(e) => setRawCategory(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none font-mono"
                  >
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select
                    value={rawVerdict}
                    onChange={(e) => setRawVerdict(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none font-mono"
                  >
                    {verdictsList.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                {/* Add & Export Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{t.btnExportCsv}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingRecord({
                        id: `raw-${Date.now()}`,
                        title: "",
                        claim: "",
                        source: "",
                        source_url: "",
                        category: "General",
                        region: "Global",
                        verdict: "FALSE",
                        evidence: "",
                        reliability_score: 95.0,
                        verification_date: new Date().toISOString().split("T")[0]
                      });
                      setShowRecordModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.btnAddRecord}</span>
                  </button>
                </div>

              </div>

              {/* Table */}
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-4">{t.colTitle}</th>
                        <th className="p-4">{t.colVerdict}</th>
                        <th className="p-4">{t.colCategory}</th>
                        <th className="p-4">{t.colSource}</th>
                        <th className="p-4">{t.colDate}</th>
                        <th className="p-4 text-right">{t.colActions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRawData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            No raw records match the current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRawData.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="p-4 max-w-sm">
                              <p className="font-bold text-white leading-snug">{item.title}</p>
                              <p className="text-slate-400 line-clamp-1 mt-0.5">{item.claim}</p>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                                item.verdict === "TRUE" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" :
                                item.verdict === "FALSE" ? "bg-rose-500/20 text-rose-400 border border-rose-500/40" :
                                "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              }`}>
                                {item.verdict}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-slate-300">{item.category}</td>
                            <td className="p-4 max-w-[160px] truncate text-slate-300">
                              {item.source}
                            </td>
                            <td className="p-4 font-mono text-slate-400">{item.verification_date || item.publication_date}</td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setEditingRecord(item);
                                  setShowRecordModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(item.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: FACT ARTICLES */}
          {activeTab === "articles" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-mono">
                  {articles.length} published investigative articles in editorial catalogue.
                </p>
                <button
                  onClick={() => {
                    setEditingArticle({
                      id: `art-${Date.now()}`,
                      title: "",
                      slug: "",
                      summary: "",
                      content: "",
                      category: "Technology",
                      thumbnail_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
                      tags: ["FactCheck", "Investigation"],
                      author: "TruthLens Investigative Desk",
                      status: "PUBLISHED"
                    });
                    setShowArticleModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Investigation Article</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {articles.map((art) => (
                  <div key={art.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="text-emerald-400 font-bold">{art.category}</span>
                        <span>{new Date(art.published_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-base font-bold text-white leading-snug">{art.title}</h4>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{art.summary}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                      <span className="text-slate-400 font-mono">Author: {art.author}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingArticle(art);
                            setShowArticleModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:text-white"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVITY LOGS */}
          {activeTab === "logs" && (
            <div className="glass-panel rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Audit & Security Event Trail
                </h3>
                <span className="text-xs font-mono text-slate-400">{logs.length} logged events</span>
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2">
                {logs.map((lg) => (
                  <div key={lg.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          {lg.action}
                        </span>
                        <span className="text-slate-300">{lg.details}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">Admin: {lg.admin_id}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(lg.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM SETTINGS */}
          {activeTab === "settings" && settingsData && (
            <div className="glass-panel rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 max-w-3xl">
              <h3 className="text-base font-bold text-white font-mono tracking-wide">
                System Verification Thresholds & Provider Matrix
              </h3>

              <div className="space-y-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <label className="text-slate-300">Minimum Confidence Threshold for TRUE (%)</label>
                  <input
                    type="number"
                    value={settingsData.confidence_threshold_true || 80}
                    onChange={(e) => setSettingsData({ ...settingsData, confidence_threshold_true: parseFloat(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300">Rate Limit Per Minute per IP</label>
                  <input
                    type="number"
                    value={settingsData.rate_limit_per_minute || 60}
                    onChange={(e) => setSettingsData({ ...settingsData, rate_limit_per_minute: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-slate-300 font-bold">Verification Providers Active:</p>
                  {Object.entries(settingsData.enabled_providers || {}).map(([p, enabled]) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          const updated = { ...settingsData.enabled_providers, [p]: e.target.checked };
                          setSettingsData({ ...settingsData, enabled_providers: updated });
                        }}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                      />
                      <span className="capitalize text-slate-300">{p.replace("_", " ")} Provider</span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await api.updateAdminSettings(settingsData);
                    showToast("System settings updated.");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* RECORD MODAL */}
      {showRecordModal && editingRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowRecordModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white">
              {editingRecord.id ? "Edit Raw Fact Check Record" : "Add New Fact Check Record"}
            </h3>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Title</label>
                <input
                  type="text"
                  required
                  value={editingRecord.title}
                  onChange={(e) => setEditingRecord({ ...editingRecord, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Claim Statement</label>
                <textarea
                  rows={2}
                  required
                  value={editingRecord.claim}
                  onChange={(e) => setEditingRecord({ ...editingRecord, claim: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-mono">Verdict</label>
                  <select
                    value={editingRecord.verdict}
                    onChange={(e) => setEditingRecord({ ...editingRecord, verdict: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono"
                  >
                    <option value="TRUE">TRUE</option>
                    <option value="MOSTLY TRUE">MOSTLY TRUE</option>
                    <option value="PARTLY TRUE">PARTLY TRUE</option>
                    <option value="MISLEADING">MISLEADING</option>
                    <option value="FALSE">FALSE</option>
                    <option value="UNVERIFIED">UNVERIFIED</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-mono">Category</label>
                  <select
                    value={editingRecord.category}
                    onChange={(e) => setEditingRecord({ ...editingRecord, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono"
                  >
                    <option value="Health">Health</option>
                    <option value="Economy">Economy</option>
                    <option value="Science">Science</option>
                    <option value="Technology">Technology</option>
                    <option value="Politics">Politics</option>
                    <option value="Climate">Climate</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Evidence & Verification Summary</label>
                <textarea
                  rows={3}
                  required
                  value={editingRecord.evidence}
                  onChange={(e) => setEditingRecord({ ...editingRecord, evidence: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-mono">Source Name</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.source}
                    onChange={(e) => setEditingRecord({ ...editingRecord, source: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-mono">Source URL</label>
                  <input
                    type="url"
                    required
                    value={editingRecord.source_url}
                    onChange={(e) => setEditingRecord({ ...editingRecord, source_url: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                >
                  Save Fact Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ARTICLE MODAL */}
      {showArticleModal && editingArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fadeIn">
          <div className="w-full max-w-2xl glass-panel rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowArticleModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white">
              Create Fact Article
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await api.createArticle(editingArticle);
                setShowArticleModal(false);
                const updated = await api.getArticles();
                setArticles(updated || []);
                showToast("Investigation article published.");
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Title</label>
                <input
                  type="text"
                  required
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Summary</label>
                <textarea
                  rows={2}
                  required
                  value={editingArticle.summary}
                  onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-mono">Content</label>
                <textarea
                  rows={5}
                  required
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold"
                >
                  Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
