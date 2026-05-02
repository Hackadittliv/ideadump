// Exa.ai search & findSimilar — neural sökmotor optimerad för LLMer.
// Returnerar strukturerade dokument med URL + extracted full text.
//
// Body: { query: string, numResults?: number, mode?: "search" | "similar" }
// Response: { provider:"exa", results: [{title,url,snippet,publishedDate,similarity}], rawCount }
const { requireUser } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "EXA_API_KEY saknas i Netlify-miljövariablerna." }),
    };
  }

  let query, numResults, mode;
  try {
    ({ query, numResults = 8, mode = "search" } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }
  if (!query || typeof query !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "query (string) krävs." }) };
  }

  const endpoint = mode === "similar"
    ? "https://api.exa.ai/findSimilar"
    : "https://api.exa.ai/search";

  const body = mode === "similar"
    ? { url: query, numResults, contents: { text: { maxCharacters: 800 } } }
    : {
        query,
        numResults,
        type: "neural",
        useAutoprompt: true,
        contents: { text: { maxCharacters: 800 } },
      };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: `Exa API ${res.status}: ${err.slice(0, 300)}` }),
    };
  }

  const data = await res.json();
  const results = (data.results || []).map((r) => ({
    title: r.title || "(utan titel)",
    url: r.url,
    snippet: (r.text || "").slice(0, 600).trim(),
    publishedDate: r.publishedDate || null,
    author: r.author || null,
    similarity: r.score ?? null,
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "exa", mode, results, rawCount: results.length }),
  };
};
