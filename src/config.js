/**
 * Runtime knobs that stay out of gameplay code.
 *
 * Video generation talks to whatever endpoint you set. An empty endpoint
 * uses the built-in demo clip so the studio is playable without secrets.
 *
 * Ways to point at a real provider (never commit keys here):
 *   1. window.PIBO_VIDEO_API = "https://your-api.example/generate"
 *   2. localStorage.setItem("PIBO_VIDEO_API", "https://...")
 *   3. Open the game with ?videoApi=https://your-api.example/generate
 */
export function getVideoApiUrl() {
  try {
    const q = new URLSearchParams(window.location.search).get("videoApi");
    if (q) return q;
  } catch {
    // ignore
  }
  if (typeof window !== "undefined" && window.PIBO_VIDEO_API) {
    return String(window.PIBO_VIDEO_API);
  }
  try {
    const stored = localStorage.getItem("PIBO_VIDEO_API");
    if (stored) return stored;
  } catch {
    // ignore
  }
  return "";
}
