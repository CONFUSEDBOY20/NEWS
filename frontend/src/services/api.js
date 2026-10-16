export function getApiBase() {
  const envUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ""
  ).trim();

  const isBrowser = typeof window !== "undefined";
  const isVercelOrRemote =
    isBrowser &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  // In production on Vercel or preview, if VITE_API_BASE_URL is unset or pointing to Render cold start,
  // default to same-origin /api (Vercel Serverless Function)
  if (isVercelOrRemote) {
    if (!envUrl || envUrl.includes("onrender.com")) {
      return "/api";
    }
  }

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  return "/api";
}

export const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(status, code, message, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

function getHeaders(isMultipart = false) {
  const headers = {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("truthlens_admin_token")
      : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Universal request helper:
 * - Uses AbortController with 20s timeout (45s for image uploads)
 * - Throws typed ApiError {status, code, message} on !res.ok or network failure
 * - Never swallows errors or injects simulated data
 */
export async function request(path, options = {}) {
  const isImageUpload =
    options.isImageUpload ||
    path.includes("/fact-check/image") ||
    options.body instanceof FormData;
  const timeoutMs = options.timeoutMs || (isImageUpload ? 45000 : 20000);

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error("Request timed out. Please try again."));
  }, timeoutMs);

  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const isMultipart = options.body instanceof FormData;
  const baseHeaders = getHeaders(isMultipart);
  const headers = {
    ...baseHeaders,
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      let errData = null;
      let errMsg = `Request failed with status ${res.status}`;
      try {
        errData = await res.json();
        errMsg = errData?.detail || errData?.message || errMsg;
      } catch {
        try {
          const txt = await res.text();
          if (txt) errMsg = txt;
        } catch {
          // ignore parsing error
        }
      }

      let code = "HTTP_ERROR";
      if (res.status === 429) {
        code = "RATE_LIMITED";
        errMsg = "Too many requests, wait a minute.";
      } else if (res.status === 401) {
        code = "UNAUTHORIZED";
      } else if (res.status === 403) {
        code = "FORBIDDEN";
      } else if (res.status === 404) {
        code = "NOT_FOUND";
      } else if (res.status >= 500) {
        code = "SERVER_ERROR";
        errMsg = "Verification service is unavailable. Please try again.";
      }

      throw new ApiError(res.status, code, errMsg, errData);
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    return await res.text();
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err.name === "AbortError" || err.message?.includes("timed out")) {
      throw new ApiError(
        408,
        "TIMEOUT",
        "Request timed out. Verification service may be under load. Please try again."
      );
    }
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      err.message || "Verification service is unavailable. Please try again."
    );
  }
}

/**
 * Stream real-time investigative fact-check pipeline via SSE.
 * Emits progress stages and tokens to onStageUpdate callback:
 *   onStageUpdate({ stage, message, delta, result })
 * Returns final FactCheckResponse object.
 */
export async function streamFactCheck(claimInput, onStageUpdate) {
  const text = typeof claimInput === "string" ? claimInput : (claimInput?.text || "");
  const language = claimInput?.language || "en";
  const title = claimInput?.title || "";

  const url = `${API_BASE}/fact-check/stream`;
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("truthlens_admin_token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, language, title })
    });

    if (!res.ok || !res.body) {
      throw new Error(`Streaming request failed: status ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.replace(/^data:\s*/, "");
          try {
            const eventData = JSON.parse(jsonStr);
            if (onStageUpdate && typeof onStageUpdate === "function") {
              onStageUpdate(eventData);
            }
            if (eventData.stage === "complete" && eventData.result) {
              finalResult = {
                ...eventData.result,
                isLiveVerification: eventData.result.is_live_verification !== false,
                verificationSource: eventData.result.verification_source || "live-ai",
              };
            }
          } catch {
            // ignore JSON parse error in individual SSE event
          }
        }
      }
    }

    if (finalResult) {
      return finalResult;
    }

    // If stream ended without complete event, fallback to standard verifyText
    return await api.verifyText(text, language);
  } catch (err) {
    console.warn("SSE stream failed or unsupported, falling back to standard verifyText:", err);
    return await api.verifyText(text, language);
  }
}

// ── Main API Interface ──

export const api = {
  // Public Fact-Checking
  streamFactCheck,

  verifyUrl: async (url, language = "en", title = "") => {
    const res = await request("/fact-check/url", {
      method: "POST",
      body: JSON.stringify({ url, language, title }),
    });
    return {
      ...res,
      isLiveVerification: res?.is_live_verification !== false,
      verificationSource: res?.verification_source || "live-ai",
    };
  },

  verifyText: async (text, language = "en") => {
    const res = await request("/fact-check/text", {
      method: "POST",
      body: JSON.stringify({ text, language }),
    });
    return {
      ...res,
      isLiveVerification: res?.is_live_verification !== false,
      verificationSource: res?.verification_source || "live-ai",
    };
  },

  verifyImage: async (file, language = "en") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    const res = await request("/fact-check/image", {
      method: "POST",
      body: formData,
      isImageUpload: true,
    });
    return {
      ...res,
      isLiveVerification: res?.is_live_verification !== false,
      verificationSource: res?.verification_source || "live-ai",
    };
  },

  detectLiveNews: async ({
    region = "global",
    category = "All",
    limit = 8,
    language = "en",
  } = {}) => {
    const params = new URLSearchParams();
    params.set("region", region);
    params.set("limit", String(limit));
    params.set("language", language);
    if (category && category !== "All") params.set("category", category);
    return await request(`/fact-check/live-news?${params.toString()}`);
  },

  // News Feeds
  getWorldNews: async (category = "All", fresh = false) => {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (fresh) params.set("fresh", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return await request(`/news/world${query}`, { timeoutMs: 55_000 });
  },

  getIndiaNews: async (category = "All", fresh = false) => {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (fresh) params.set("fresh", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return await request(`/news/india${query}`, { timeoutMs: 55_000 });
  },

  searchNews: async (query, page = 1, pageSize = 20, fresh = false) => {
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    if (fresh) params.set("fresh", "true");
    return await request(`/news/search?${params.toString()}`, { timeoutMs: 55_000 });
  },

  getLiveTicker: async () => {
    return await request("/news/ticker", { timeoutMs: 55_000 });
  },

  getNewsStatus: async () => {
    return await request("/news/status");
  },

  getNewsMeta: async () => {
    return await request("/news/meta");
  },

  getLiveNews: async ({ category = "", q = "", country = "", fresh = false } = {}) => {
    const params = new URLSearchParams();
    if (category && category !== "Top" && category !== "All") {
      params.set("category", category);
    }
    if (q) params.set("q", q);
    if (country) params.set("country", country);
    if (fresh) params.set("fresh", "true");
    return await request(`/news?${params.toString()}`);
  },

  // Fact Articles
  getArticles: async (category = null) => {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    return await request(`/articles${query}`);
  },

  getArticleDetail: async (id) => {
    return await request(`/articles/${encodeURIComponent(id)}`);
  },

  // Admin Portal - Backend only, never faked
  adminLogin: async (email, password) => {
    const data = await request("/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data?.access_token) {
      localStorage.setItem("truthlens_admin_token", data.access_token);
    }
    return data;
  },

  getAdminDashboard: async () => {
    return await request("/admin/dashboard");
  },

  getRawData: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return await request(`/admin/raw-data${q ? `?${q}` : ""}`);
  },

  createRawData: async (record) => {
    return await request("/admin/raw-data", {
      method: "POST",
      body: JSON.stringify(record),
    });
  },

  updateRawData: async (id, updates) => {
    return await request(`/admin/raw-data/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  deleteRawData: async (id) => {
    return await request(`/admin/raw-data/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  getAdminLogs: async () => {
    return await request("/admin/logs");
  },

  getAdminSettings: async () => {
    return await request("/admin/settings");
  },

  getAdminProviderStatus: async () => {
    return await request("/admin/provider-status");
  },

  updateAdminSettings: async (settings) => {
    return await request("/admin/settings", {
      method: "POST",
      body: JSON.stringify(settings),
    });
  },

  createArticle: async (article) => {
    return await request("/admin/articles", {
      method: "POST",
      body: JSON.stringify(article),
    });
  },

  updateArticle: async (id, article) => {
    return await request(`/admin/articles/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(article),
    });
  },

  deleteArticle: async (id) => {
    return await request(`/admin/articles/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
