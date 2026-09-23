const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getHeaders(isMultipart = false) {
  const headers = {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  const token = localStorage.getItem("truthlens_admin_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Public Fact-Checking
  verifyUrl: async (url, language = "en") => {
    const res = await fetch(`${API_BASE}/fact-check/url`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ url, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Verification failed" }));
      throw new Error(err.detail || "Verification request failed");
    }
    return res.json();
  },

  verifyText: async (text, language = "en") => {
    const res = await fetch(`${API_BASE}/fact-check/text`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Verification failed" }));
      throw new Error(err.detail || "Verification request failed");
    }
    return res.json();
  },

  verifyImage: async (file, language = "en") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);
    const res = await fetch(`${API_BASE}/fact-check/image`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Image verification failed" }));
      throw new Error(err.detail || "Image verification failed");
    }
    return res.json();
  },

  // News Feeds
  getWorldNews: async (category = "All") => {
    const query = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`${API_BASE}/news/world${query}`);
    return res.json();
  },

  getIndiaNews: async (category = "All") => {
    const query = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`${API_BASE}/news/india${query}`);
    return res.json();
  },

  searchNews: async (query) => {
    const res = await fetch(`${API_BASE}/news/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  // Fact Articles
  getArticles: async (category = null) => {
    const query = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`${API_BASE}/articles${query}`);
    return res.json();
  },

  getArticleDetail: async (id) => {
    const res = await fetch(`${API_BASE}/articles/${id}`);
    return res.json();
  },

  // Admin Portal
  adminLogin: async (email, password) => {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Authentication failed" }));
      throw new Error(err.detail || "Authentication failed");
    }
    return res.json();
  },

  getAdminDashboard: async () => {
    const res = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  getRawData: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== "All") params.append("category", filters.category);
    if (filters.verdict && filters.verdict !== "All") params.append("verdict", filters.verdict);
    if (filters.search) params.append("search", filters.search);
    const res = await fetch(`${API_BASE}/admin/raw-data?${params.toString()}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  createRawData: async (record) => {
    const res = await fetch(`${API_BASE}/admin/raw-data`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(record),
    });
    return res.json();
  },

  updateRawData: async (id, updates) => {
    const res = await fetch(`${API_BASE}/admin/raw-data/${id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  deleteRawData: async (id) => {
    const res = await fetch(`${API_BASE}/admin/raw-data/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  getAdminLogs: async () => {
    const res = await fetch(`${API_BASE}/admin/logs`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getAdminSettings: async () => {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  updateAdminSettings: async (settings) => {
    const res = await fetch(`${API_BASE}/admin/settings`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  },
};
