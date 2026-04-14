/**
 * API client for the FastAPI backend.
 * Calls go through Next.js rewrites (/api/backend/*) so the backend URL
 * is never exposed to the browser.
 */

const BASE = "/api/backend";

export const apiClient = {
  async segment(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE}/segment`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail?.detail ?? `HTTP ${response.status}`);
    }

    return response.json();
  },

  async health() {
    const response = await fetch(`${BASE}/health`);
    return response.json();
  },
};
