// Smart-route validering: Exa hittar semantically similar produkter →
// Claude (med Christians kontext) ger en kort verdict. Snabbare och billigare
// än tripel-check; default-val för "🔎 Validera"-knappen.
//
// Body: { query: string, ideaContext?: string }
// Response: {
//   mode: "smart",
//   conclusion: string,
//   noveltyScore: number,
//   recommendation: "go"|"pivot"|"reconsider"|"skip",
//   topCompetitors: string[],
//   uniqueAngle: string,
//   redFlag: string,
//   sources: [{provider:"exa",title,url,snippet}]
// }

const { CHRISTIAN_CONTEXT } = require("./_research-prompt.js");
const { requireUser } = require("./_auth");

async function callExa(query, baseUrl, authHeader) {
  const res = await fetch(`${baseUrl}/.netlify/functions/research-exa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({ query, numResults: 8, mode: "search" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Exa HTTP ${res.status}`);
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  let query, ideaContext;
  try {
    ({ query, ideaContext = "" } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }
  if (!query || typeof query !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "query (string) krävs." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY krävs." }),
    };
  }

  const baseUrl = process.env.URL || process.env.DEPLOY_URL || `https://${event.headers.host}`;
  const authHeader = event.headers?.authorization || event.headers?.Authorization || "";

  let exaData;
  try {
    exaData = await callExa(query, baseUrl, authHeader);
  } catch (e) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: `Exa-anrop misslyckades: ${e.message}` }),
    };
  }

  const sources = (exaData.results || []).map((r) => ({
    provider: "exa",
    title: r.title,
    url: r.url,
    snippet: r.snippet,
  }));

  const exaContext = sources
    .slice(0, 8)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join("\n\n");

  const synth = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      system: `${CHRISTIAN_CONTEXT}

Du analyserar om en av Christians idéer redan finns på marknaden, baserat på sökresultat från Exa (neural similarity). Var rak och kort. Returnera ENDAST kompakt JSON utan markdown.`,
      messages: [
        {
          role: "user",
          content: `IDÉ:
"${query}"

${ideaContext ? `Kontext: ${ideaContext}\n\n` : ""}EXA-SÖKRESULTAT (semantically similar):
${exaContext || "(inga resultat)"}

Returnera EXAKT detta JSON:
{
  "conclusion": "2-3 meningar: vad finns redan, vad är Christians unika vinkel",
  "noveltyScore": 7,
  "recommendation": "go",
  "topCompetitors": ["Namn 1", "Namn 2"],
  "uniqueAngle": "1 mening",
  "redFlag": "1 mening eller tom sträng"
}
recommendation: "go", "pivot", "reconsider", "skip". noveltyScore: 0-10.`,
        },
      ],
    }),
  });

  let result = {
    conclusion: "Kunde inte analysera.",
    noveltyScore: 5,
    recommendation: "reconsider",
    topCompetitors: [],
    uniqueAngle: "",
    redFlag: "",
  };

  if (synth.ok) {
    const data = await synth.json();
    const raw = data.content?.[0]?.text || "";
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        result = { ...result, ...JSON.parse(raw.slice(start, end + 1)) };
      }
    } catch {
      result.conclusion = raw.slice(0, 400);
    }
  } else {
    const err = await synth.text().catch(() => "");
    return {
      statusCode: synth.status,
      body: JSON.stringify({ error: `Synthesis failed: ${err.slice(0, 300)}` }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "smart", ...result, sources }),
  };
};
