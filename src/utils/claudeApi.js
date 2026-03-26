// Extraherar JSON ur Claude-svar, även om det innehåller markdown-wrappers
function extractJson(raw) {
  let text = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Inget JSON-block hittades i svaret");
  return JSON.parse(text.slice(start, end + 1));
}

const FALLBACK = {
  summary: "Kunde inte analysera idén automatiskt.",
  energyScore: 5, potentialScore: 5,
  ice: { impact: 5, confidence: 5, ease: 5 },
  suggestedBrand: "Övrigt", tags: [], pros: [], cons: [],
  biggestRisk: "", energyWarning: "neutral",
  coachComment: "", nextActionSuggestion: "", whyThisMatters: "",
};

export async function analyzeIdea(transcript) {
  const res = await fetch("/.netlify/functions/claude-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error || `HTTP ${res.status}`;
    if (res.status === 503) throw new Error("API-nyckel saknas på servern. Lägg till ANTHROPIC_API_KEY i Netlify-miljövariabler.");
    if (res.status === 401) throw new Error("Ogiltig API-nyckel på servern.");
    if (res.status === 429) throw new Error("Rate limit nådd. Vänta en stund och försök igen.");
    if (res.status >= 500) throw new Error("Servern svarar inte just nu. Försök igen om en minut.");
    throw new Error(msg);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text || "";

  try {
    const parsed = extractJson(raw);
    return { ...FALLBACK, ...parsed, ice: { ...FALLBACK.ice, ...(parsed.ice || {}) } };
  } catch {
    return { ...FALLBACK, summary: raw.slice(0, 300) || FALLBACK.summary };
  }
}
