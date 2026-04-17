// Tripel-check: kör Exa + Perplexity + Claude web_search PARALLELLT, sen
// låter Claude (utan tools) syntesera resultaten med kontext om Christians
// mål. Returnerar ett strukturerat verdict + alla källor.
//
// Body: { query: string, ideaContext?: string }
// Response: {
//   mode: "triple",
//   conclusion: string,
//   noveltyScore: number,        // 0-10, hur originell idén är
//   recommendation: "go" | "pivot" | "reconsider" | "skip",
//   sources: [{provider,title,url,snippet}],
//   providersOk: { exa:bool, perplexity:bool, claude:bool },
//   errors: { exa?:string, perplexity?:string, claude?:string }
// }

const { CHRISTIAN_CONTEXT } = require("./_research-prompt.js");

async function callFunction(name, body, baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/.netlify/functions/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error || `HTTP ${res.status}` };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let query, ideaContext;
  try {
    ({ query, ideaContext = "" } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }
  if (!query || typeof query !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "query (string) krävs." }) };
  }

  // baseUrl för intern function-to-function-anrop. Netlify exponerar URL via env.
  const baseUrl = process.env.URL || process.env.DEPLOY_URL || `https://${event.headers.host}`;

  // Fan out parallellt
  const [exa, ppx, cls] = await Promise.all([
    callFunction("research-exa", { query, numResults: 6, mode: "search" }, baseUrl),
    callFunction("research-perplexity", { query }, baseUrl),
    callFunction("research-claude-search", { query }, baseUrl),
  ]);

  // Samla källor från alla providers
  const sources = [];
  const providersOk = { exa: exa.ok, perplexity: ppx.ok, claude: cls.ok };
  const errors = {};

  if (exa.ok) {
    for (const r of exa.data.results || []) {
      sources.push({ provider: "exa", title: r.title, url: r.url, snippet: r.snippet });
    }
  } else {
    errors.exa = exa.error;
  }

  if (ppx.ok) {
    // Perplexity har ett synthesised answer + citations — lagra answer som "kontext"
    for (const c of ppx.data.citations || []) {
      sources.push({ provider: "perplexity", title: c.title, url: c.url, snippet: "" });
    }
  } else {
    errors.perplexity = ppx.error;
  }

  if (cls.ok) {
    for (const c of cls.data.citations || []) {
      sources.push({ provider: "claude", title: c.title, url: c.url, snippet: "" });
    }
  } else {
    errors.claude = cls.error;
  }

  // Bygg syntes-prompt
  const exaText = exa.ok
    ? (exa.data.results || [])
        .slice(0, 6)
        .map((r, i) => `[Exa ${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
        .join("\n\n")
    : `(Exa misslyckades: ${errors.exa || "okänt"})`;
  const ppxText = ppx.ok
    ? `Perplexity-svar:\n${ppx.data.answer || "(tomt)"}\nKällor: ${(ppx.data.citations || []).map((c) => c.url).join(", ")}`
    : `(Perplexity misslyckades: ${errors.perplexity || "okänt"})`;
  const clsText = cls.ok
    ? `Claude web search-svar:\n${cls.data.answer || "(tomt)"}\nKällor: ${(cls.data.citations || []).map((c) => c.url).join(", ")}`
    : `(Claude web search misslyckades: ${errors.claude || "okänt"})`;

  // Synthesisera via Claude utan tools (bara LLM, snabbt)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY krävs för synthesis." }),
    };
  }

  const synth = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: `${CHRISTIAN_CONTEXT}

Du synthetiserar resultat från tre olika söktjänster (Exa, Perplexity, Claude web search) för att avgöra om en idé är värd att gå vidare med. Var rak och konkret. Returnera ENDAST kompakt JSON utan markdown.`,
      messages: [
        {
          role: "user",
          content: `IDÉ FRÅN CHRISTIAN:
"${query}"

${ideaContext ? `Kontext: ${ideaContext}\n\n` : ""}TRIPEL-SÖK-RESULTAT:

=== EXA (semantic similar products) ===
${exaText}

=== PERPLEXITY (synthesised market answer) ===
${ppxText}

=== CLAUDE WEB SEARCH (current/Nordic context) ===
${clsText}

Returnera EXAKT detta JSON:
{
  "conclusion": "2-3 meningar: är idén ny, finns konkurrenter, var unika vinkeln ligger",
  "noveltyScore": 7,
  "recommendation": "go",
  "topCompetitors": ["Konkurrent 1 (URL)", "Konkurrent 2 (URL)"],
  "uniqueAngle": "1 mening om vad som gör Christians vinkel unik",
  "redFlag": "1 mening om största risken eller varför det inte funkar — eller tom sträng"
}
recommendation: "go" (kör), "pivot" (idén är OK men måste vinklas om), "reconsider" (osäkert, gör mer research), "skip" (gör inte). noveltyScore: 0-10 där 10 = helt unikt.`,
        },
      ],
    }),
  });

  let synthesis = {
    conclusion: "Kunde inte syntetisera resultaten.",
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
        synthesis = { ...synthesis, ...JSON.parse(raw.slice(start, end + 1)) };
      }
    } catch {
      synthesis.conclusion = raw.slice(0, 400);
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "triple",
      ...synthesis,
      sources,
      providersOk,
      errors,
    }),
  };
};
