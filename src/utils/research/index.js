// Research-klient — anropar Netlify Functions för web-search-providers.
//
// Smart routing default: validateIdea() kör Exa+Claude (snabbt, billigt).
// För djupare research: tripleCheckIdea() fan-outar till alla tre providers.
import { authedFetch } from "../authedFetch.js";

/**
 * Bygg en koncis sökfras från en idé.
 * Föredrar AI-genererad summary om den finns, annars första 200 tecken av transcript.
 */
export function ideaToQuery(idea) {
  const summary = idea?.aiAnalysis?.summary;
  if (summary && summary.length > 10) return summary;
  const t = (idea?.transcript || "").trim();
  return t.slice(0, 200);
}

async function postJson(path, body) {
  const res = await authedFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    if (res.status === 503) throw new Error(`Saknar API-nyckel på servern: ${msg}`);
    if (res.status === 429) throw new Error("Rate limit nådd. Vänta lite och försök igen.");
    throw new Error(msg);
  }
  return data;
}

/**
 * Smart-route validering: Exa similarity + Claude synthesis.
 * Snabb (~3-4 sek) och billig (~2 öre).
 */
export async function validateIdea(idea) {
  const query = ideaToQuery(idea);
  if (!query) throw new Error("Idén saknar text att validera.");
  const ideaContext = `Brand: ${idea.brand || "Övrigt"}, Status: ${idea.status || "inbox"}`;
  return postJson("/.netlify/functions/research-validate", { query, ideaContext });
}

/**
 * Tripel-check: Exa + Perplexity + Claude web_search parallellt + Claude synthesis.
 * Långsam (~6-10 sek) och dyrare (~5-10 öre). För `next`-status idéer.
 */
export async function tripleCheckIdea(idea) {
  const query = ideaToQuery(idea);
  if (!query) throw new Error("Idén saknar text att validera.");
  const ideaContext = `Brand: ${idea.brand || "Övrigt"}, Status: ${idea.status || "inbox"}`;
  return postJson("/.netlify/functions/research-triple-check", { query, ideaContext });
}

/**
 * Direkt-anrop till en specifik provider — för debug eller specifik routing.
 */
export const providers = {
  exa: (query, opts = {}) =>
    postJson("/.netlify/functions/research-exa", { query, ...opts }),
  perplexity: (query) =>
    postJson("/.netlify/functions/research-perplexity", { query }),
  claude: (query) =>
    postJson("/.netlify/functions/research-claude-search", { query }),
};

/**
 * UI-helper: ger en svensk färg+etikett för en recommendation.
 */
export function recLabel(rec) {
  switch (rec) {
    case "go":
      return { label: "✅ Kör", color: "#00ff88" };
    case "pivot":
      return { label: "🔄 Pivotera", color: "#F2B8B4" };
    case "reconsider":
      return { label: "🤔 Tänk om", color: "#F2B8B4" };
    case "skip":
      return { label: "⏭ Hoppa över", color: "#ff6644" };
    default:
      return { label: rec || "?", color: "#888" };
  }
}
