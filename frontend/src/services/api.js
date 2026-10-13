export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "/api"
    : "http://localhost:8000/api");

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

// ── Main API Interface ──

export const api = {
  // Public Fact-Checking
  verifyUrl: async (url, language = "en", title = "") => {
    return await request("/fact-check/url", {
      method: "POST",
      body: JSON.stringify({ url, language, title }),
    });
  },

  verifyText: async (text, language = "en") => {
    return await request("/fact-check/text", {
      method: "POST",
      body: JSON.stringify({ text, language }),
    });
  },

  verifyImage: async (file, language = "en") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    return await request("/fact-check/image", {
      method: "POST",
      body: formData,
      isImageUpload: true,
    });
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
    return await request(`/news/world${query}`);
  },

  getIndiaNews: async (category = "All", fresh = false) => {
    const params = new URLSearchParams();
    if (category && category !== "All") params.set("category", category);
    if (fresh) params.set("fresh", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return await request(`/news/india${query}`);
  },

  searchNews: async (query) => {
    return await request(`/news/search?q=${encodeURIComponent(query)}`);
  },

  getLiveTicker: async () => {
    return await request("/news/ticker");
  },

  getLiveNews: async ({ category = "", q = "", country = "" } = {}) => {
    const params = new URLSearchParams();
    if (category && category !== "Top" && category !== "All") {
      params.set("category", category);
    }
    if (q) params.set("q", q);
    if (country) params.set("country", country);
    return await request(`/news/search?${params.toString()}`);
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
