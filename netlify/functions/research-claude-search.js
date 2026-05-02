// Claude med web_search-tool — Anthropic kör sökning + svar i samma anrop.
// Bra för svenska/nordiska frågor och dialog-stil research.
//
// Body: { query: string }
// Response: { provider:"claude", answer: string, citations: [{title,url}] }
//
// Obs: tool-typen 'web_search_20250305' lanserades av Anthropic — om den
// inte är tillgänglig på din plan, returnerar Anthropic ett 400-fel och
// du måste antingen aktivera tool-access eller ta bort denna provider.
const { requireUser } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY saknas i Netlify-miljövariablerna." }),
    };
  }

  let query;
  try {
    ({ query } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }
  if (!query || typeof query !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "query (string) krävs." }) };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      system:
        "Du är en svensk researchassistent. Använd web_search-verktyget för att hitta aktuell information. Svara koncist på svenska. Citera källor du faktiskt använt.",
      messages: [{ role: "user", content: query }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: `Anthropic web_search ${res.status}: ${err.slice(0, 300)}` }),
    };
  }

  const data = await res.json();

  // Plocka ut text och citations från content-blocken
  let answer = "";
  const citations = [];
  for (const block of data.content || []) {
    if (block.type === "text") {
      answer += block.text;
      // text-blocken kan ha citations från web_search
      for (const c of block.citations || []) {
        if (c.type === "web_search_result_location") {
          citations.push({ title: c.title || "", url: c.url || "" });
        }
      }
    }
  }

  // Dedupe citations på URL
  const seen = new Set();
  const uniqueCitations = citations.filter((c) => {
    if (!c.url || seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "claude", answer, citations: uniqueCitations }),
  };
};
