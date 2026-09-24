import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  Database,
  Globe2,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Pause,
  Play,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";

const categories = ["All", "Politics", "Technology", "Health", "Economy", "Climate", "Science"];
const storageKeys = {
  history: "truthlens_live_detection_history",
  queue: "truthlens_review_queue",
  seenAlerts: "truthlens_live_alerts_seen",
};

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function riskClasses(level) {
  if (level === "HIGH") return "border-rose-500/30 bg-rose-500/10 text-rose-200";
  if (level === "MEDIUM") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
}

function verdictClasses(verdict) {
  if (["FALSE", "MISLEADING"].includes(verdict)) return "text-rose-300";
  if (["PARTLY TRUE", "UNVERIFIED", "INSUFFICIENT EVIDENCE"].includes(verdict)) return "text-amber-300";
  return "text-emerald-300";
}

function relativeTime(iso) {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function normalizeQueueItem(item) {
  return {
    id: `${item.article_id || "social"}-${item.fact_check_id}`,
    status: "NEEDS REVIEW",
    reviewer_note: "",
    added_at: new Date().toISOString(),
    ...item,
  };
}

export function LiveDetectionView() {
  const {
    language,
    setActiveView,
    setInputPreload,
    setVerificationResult,
    showToast,
  } = useApp();
  const [activeTab, setActiveTab] = useState("live");
  const [region, setRegion] = useState("global");
  const [category, setCategory] = useState("All");
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => readStorage(storageKeys.history, []));
  const [reviewQueue, setReviewQueue] = useState(() => readStorage(storageKeys.queue, []));
  const [seenAlerts, setSeenAlerts] = useState(() => readStorage(storageKeys.seenAlerts, []));
  const [socialText, setSocialText] = useState("");
  const [socialResult, setSocialResult] = useState(null);
  const [isSocialChecking, setIsSocialChecking] = useState(false);

  const persistHistory = useCallback((updater) => {
    setHistory((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      const compact = next.slice(0, 60);
      writeStorage(storageKeys.history, compact);
      return compact;
    });
  }, []);

  const persistQueue = useCallback((next) => {
    setReviewQueue(next);
    writeStorage(storageKeys.queue, next);
  }, []);

  const persistSeenAlerts = useCallback((next) => {
    setSeenAlerts(next);
    writeStorage(storageKeys.seenAlerts, next);
  }, []);

  const addToReviewQueue = useCallback((item) => {
    const normalized = normalizeQueueItem(item);
    const next = [normalized, ...reviewQueue.filter((entry) => entry.id !== normalized.id)].slice(0, 80);
    persistQueue(next);
    showToast("Added to review queue.");
  }, [persistQueue, reviewQueue, showToast]);

  const handleHighRiskAlerts = useCallback((detections) => {
    if (!alertsEnabled) return;
    const highRisk = detections.filter((item) => item.risk_level === "HIGH");
    const fresh = highRisk.filter((item) => !seenAlerts.includes(item.fact_check_id));
    if (!fresh.length) return;

    const message = `${fresh.length} high-risk live headline${fresh.length > 1 ? "s" : ""} detected.`;
    showToast(message);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("TruthLens high-risk alert", {
        body: fresh[0].title,
      });
    }
    persistSeenAlerts([...fresh.map((item) => item.fact_check_id), ...seenAlerts].slice(0, 200));
  }, [alertsEnabled, persistSeenAlerts, seenAlerts, showToast]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showToast("Browser notifications are not supported here.");
      return;
    }
    const permission = await Notification.requestPermission();
    showToast(permission === "granted" ? "High-risk browser alerts enabled." : "Browser alerts were not enabled.");
  };

  const loadDetections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.detectLiveNews({ region, category, limit: 8, language });
      setSnapshot(data);
      handleHighRiskAlerts(data.detections || []);
      persistHistory((current) => [
        {
          id: `${data.synced_at}-${region}-${category}`,
          synced_at: data.synced_at,
          region: data.region,
          category: data.category,
          total_scanned: data.total_scanned,
          high_risk_count: data.high_risk_count,
          medium_risk_count: data.medium_risk_count,
          low_risk_count: data.low_risk_count,
          detections: data.detections || [],
          claim_clusters: data.claim_clusters || [],
        },
        ...current,
      ]);
    } catch (err) {
      setError(err.message || "Live detection failed");
    } finally {
      setIsLoading(false);
    }
  }, [category, handleHighRiskAlerts, language, persistHistory, region]);

  useEffect(() => {
    loadDetections();
  }, [loadDetections]);

  useEffect(() => {
    if (!isMonitoring) return undefined;
    const timer = setInterval(loadDetections, 60000);
    return () => clearInterval(timer);
  }, [isMonitoring, loadDetections]);

  const totals = useMemo(() => {
    const detections = snapshot?.detections || [];
    return {
      high: detections.filter((item) => item.risk_level === "HIGH").length,
      medium: detections.filter((item) => item.risk_level === "MEDIUM").length,
      low: detections.filter((item) => item.risk_level === "LOW").length,
    };
  }, [snapshot]);

  const trends = useMemo(() => {
    const recent = history.slice(0, 12);
    const high = recent.reduce((sum, item) => sum + (item.high_risk_count || 0), 0);
    const scanned = recent.reduce((sum, item) => sum + (item.total_scanned || 0), 0);
    const repeatedSources = {};
    recent.flatMap((item) => item.detections || []).forEach((item) => {
      repeatedSources[item.source_name] = (repeatedSources[item.source_name] || 0) + 1;
    });
    const topSource = Object.entries(repeatedSources).sort((a, b) => b[1] - a[1])[0];
    return { high, scanned, topSource };
  }, [history]);

  const handleVerify = (item) => {
    setInputPreload({ type: "text", value: item.title, autoStart: true });
    setVerificationResult(null);
    setActiveView("fact-check");
    showToast("Headline loaded for full verification.");
  };

  const handleSocialCheck = async (event) => {
    event.preventDefault();
    if (socialText.trim().length < 5) {
      showToast("Paste at least 5 characters to check.");
      return;
    }
    setIsSocialChecking(true);
    try {
      const result = await api.verifyText(socialText.trim(), language);
      const riskLevel = ["FALSE", "MISLEADING"].includes(result.verdict)
        ? "HIGH"
        : ["PARTLY TRUE", "UNVERIFIED", "INSUFFICIENT EVIDENCE"].includes(result.verdict)
          ? "MEDIUM"
          : "LOW";
      const item = {
        article_id: `social-${Date.now()}`,
        title: result.primary_claim,
        source_name: "Social paste",
        source_url: "",
        published_at: new Date().toISOString(),
        region: result.location || "Global",
        category: result.category,
        risk_level: riskLevel,
        risk_score: riskLevel === "HIGH" ? result.confidence : riskLevel === "MEDIUM" ? 58 : 18,
        source_credibility: "User-submitted social content",
        source_credibility_score: 35,
        risk_signals: [result.ai_explanation],
        evidence_summary: `${result.supporting_evidence.length} supporting and ${result.contradictory_evidence.length} contradictory evidence item(s).`,
        matched_claim_group: result.category,
        verdict: result.verdict,
        confidence: result.confidence,
        detection_reason: result.ai_explanation,
        fact_check_id: result.id,
        checked_at: result.created_at,
      };
      setSocialResult(item);
      if (riskLevel !== "LOW") addToReviewQueue(item);
    } finally {
      setIsSocialChecking(false);
    }
  };

  const updateReviewStatus = (id, status) => {
    persistQueue(reviewQueue.map((item) => item.id === id ? { ...item, status, reviewed_at: new Date().toISOString() } : item));
  };

  const tabs = [
    { id: "live", label: "Live Wire", icon: Radar },
    { id: "social", label: "Social Monitor", icon: MessageSquareWarning },
    { id: "history", label: "History", icon: BarChart3 },
    { id: "queue", label: "Review Queue", icon: ClipboardList },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Real-Time Fake News Detection
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Live misinformation command center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Monitor live news, paste social claims, cluster repeated narratives, and route suspicious items into review.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={requestNotificationPermission}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs text-emerald-200 hover:bg-emerald-500/15"
          >
            <Bell className="h-3.5 w-3.5" />
            Enable alerts
          </button>
          <button
            onClick={() => setAlertsEnabled((value) => !value)}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-slate-200 hover:bg-white/[0.08]"
          >
            {alertsEnabled ? "Alerts on" : "Alerts off"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-black/30 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-colors ${
                active ? "bg-white/[0.12] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "live" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/35 p-1">
              {[
                { id: "global", label: "Global", icon: Globe2 },
                { id: "world", label: "World", icon: Globe2 },
                { id: "india", label: "India", icon: MapPin },
              ].map((item) => {
                const Icon = item.icon;
                const active = region === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setRegion(item.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      active ? "bg-white/[0.12] text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-9 rounded-xl border border-white/[0.08] bg-black/35 px-3 text-xs text-slate-200 outline-none focus:border-indigo-400/50"
            >
              {categories.map((item) => (
                <option key={item} value={item} className="bg-slate-950">
                  {item}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsMonitoring((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-xs text-slate-200 hover:bg-white/[0.08]"
            >
              {isMonitoring ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isMonitoring ? "Pause" : "Start"}
            </button>

            <button
              onClick={loadDetections}
              disabled={isLoading}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 text-xs text-indigo-200 hover:bg-indigo-500/15 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Scan now
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="High risk" value={totals.high} icon={ShieldAlert} tone="rose" />
            <MetricCard label="Needs review" value={totals.medium} icon={AlertTriangle} tone="amber" />
            <MetricCard label="Low risk" value={totals.low} icon={ShieldCheck} tone="emerald" />
          </div>

          {!!snapshot?.claim_clusters?.length && (
            <Panel title="Claim Clusters" icon={Database} meta="Repeated narratives grouped by headline keywords">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {snapshot.claim_clusters.map((cluster) => (
                  <div key={cluster.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-xs font-semibold text-white">{cluster.label}</span>
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] ${riskClasses(cluster.risk_level)}`}>
                        {cluster.risk_level}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {cluster.count} item(s), top risk {cluster.highest_risk}%
                    </p>
                    <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">
                      {cluster.sources.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel
            title="Live Detection Queue"
            icon={Radar}
            meta={snapshot ? `${snapshot.total_scanned} scanned • ${relativeTime(snapshot.synced_at)}` : "Waiting for scan"}
          >
            {error && <div className="py-6 text-sm text-rose-300">{error}</div>}
            {!error && !snapshot && (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning live wires...
              </div>
            )}
            {!error && snapshot?.detections?.length === 0 && (
              <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                No live headlines were available for this scan.
              </div>
            )}
            <DetectionList
              items={snapshot?.detections || []}
              onVerify={handleVerify}
              onQueue={addToReviewQueue}
            />
          </Panel>
        </>
      )}

      {activeTab === "social" && (
        <Panel title="Social Media Input Monitor" icon={MessageSquareWarning} meta="Paste a post, caption, forwarded message, or video transcript">
          <form onSubmit={handleSocialCheck} className="space-y-4">
            <textarea
              value={socialText}
              onChange={(event) => setSocialText(event.target.value)}
              placeholder="Paste viral claim, WhatsApp forward, X/Twitter post, YouTube caption, or transcript..."
              className="min-h-40 w-full rounded-2xl border border-white/[0.08] bg-black/35 p-4 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-400/50"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={isSocialChecking}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 text-sm text-indigo-200 hover:bg-indigo-500/15 disabled:opacity-60"
              >
                {isSocialChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
                Analyze social claim
              </button>
              <button
                type="button"
                onClick={() => setSocialText("")}
                className="h-10 rounded-xl border border-white/[0.08] px-4 text-sm text-slate-300 hover:bg-white/[0.06]"
              >
                Clear
              </button>
            </div>
          </form>
          {socialResult && (
            <div className="mt-5">
              <DetectionList items={[socialResult]} onVerify={handleVerify} onQueue={addToReviewQueue} />
            </div>
          )}
        </Panel>
      )}

      {activeTab === "history" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Recent scans" value={history.length} icon={Activity} tone="indigo" />
            <MetricCard label="Headlines scanned" value={trends.scanned} icon={Radar} tone="emerald" />
            <MetricCard label="High-risk hits" value={trends.high} icon={ShieldAlert} tone="rose" />
          </div>
          <Panel
            title="Detection History Dashboard"
            icon={BarChart3}
            meta={trends.topSource ? `Most repeated source: ${trends.topSource[0]} (${trends.topSource[1]})` : "No repeated sources yet"}
          >
            <div className="space-y-3">
              {history.length === 0 && <p className="py-8 text-sm text-slate-400">No scan history yet.</p>}
              {history.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-white">{item.region} • {item.category}</div>
                    <div className="text-[11px] text-slate-500">{relativeTime(item.synced_at)}</div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <MiniStat label="Scanned" value={item.total_scanned} />
                    <MiniStat label="High" value={item.high_risk_count} />
                    <MiniStat label="Medium" value={item.medium_risk_count} />
                    <MiniStat label="Low" value={item.low_risk_count} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {activeTab === "queue" && (
        <Panel title="Admin Review Queue" icon={ClipboardList} meta={`${reviewQueue.length} item(s) awaiting or completed review`}>
          {reviewQueue.length === 0 && <p className="py-8 text-sm text-slate-400">Add suspicious detections to build the review queue.</p>}
          <div className="space-y-3">
            {reviewQueue.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${riskClasses(item.risk_level)}`}>
                        {item.risk_level}
                      </span>
                      <span className={`text-[11px] font-mono ${verdictClasses(item.verdict)}`}>{item.verdict}</span>
                      <span className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-slate-300">{item.status}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-400">{item.detection_reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["CONFIRMED FAKE", "VERIFIED TRUE", "DUPLICATE", "NEEDS REVIEW"].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateReviewStatus(item.id, status)}
                        className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[10px] text-slate-300 hover:bg-white/[0.06] hover:text-white"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </section>
  );
}

function MetricCard({ label, value, icon: Icon, tone }) {
  const tones = {
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-200",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.indigo}`}>
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, meta, children }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/30 overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon className="h-4 w-4 text-emerald-300" />
          {title}
        </div>
        {meta && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Activity className="h-3.5 w-3.5" />
            {meta}
          </div>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function DetectionList({ items, onVerify, onQueue }) {
  return (
    <div className="divide-y divide-white/[0.06]">
      {items.map((item) => (
        <article key={`${item.article_id}-${item.fact_check_id}`} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${riskClasses(item.risk_level)}`}>
                  {item.risk_level} • {item.risk_score}%
                </span>
                <span className={`text-[11px] font-mono ${verdictClasses(item.verdict)}`}>
                  {item.verdict}
                </span>
                <span className="text-[11px] text-slate-500">{item.source_name}</span>
                <span className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-slate-400">
                  {item.source_credibility} • {item.source_credibility_score}
                </span>
              </div>
              <h2 className="text-base font-semibold leading-snug text-slate-100">
                {item.title}
              </h2>
              <p className="text-sm text-slate-400">{item.detection_reason}</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Evidence</div>
                  <p className="mt-1 text-xs text-slate-300">{item.evidence_summary}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Signals</div>
                  <p className="mt-1 text-xs text-slate-300">{(item.risk_signals || []).join(" • ")}</p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center rounded-xl border border-white/[0.08] px-3 text-xs text-slate-300 hover:text-white hover:bg-white/[0.06]"
                >
                  Source
                </a>
              )}
              <button
                onClick={() => onQueue(item)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 text-xs text-amber-200 hover:bg-amber-500/15"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Queue
              </button>
              <button
                onClick={() => onVerify(item)}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs text-emerald-200 hover:bg-emerald-500/15"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Verify
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
