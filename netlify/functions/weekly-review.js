// Veckoanalys — Claude sammanfattar Inbox + Next Action och pekar ut veckans prioriteringar
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY saknas i Netlify-miljövariablerna." }),
    };
  }

  let ideas;
  try {
    ({ ideas } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  const ideaList = ideas.map((idea, i) =>
    `${i + 1}. [${idea.brand}] ${idea.aiAnalysis?.summary || idea.transcript?.slice(0, 100)}
   ICE: ${idea.aiAnalysis ? ((idea.aiAnalysis.ice?.impact + idea.aiAnalysis.ice?.confidence + idea.aiAnalysis.ice?.ease) / 3).toFixed(1) : "?"} | Status: ${idea.status} | Skapad: ${new Date(idea.createdAt).toLocaleDateString("sv-SE")}${idea.deadline ? ` | Deadline: ${idea.deadline}` : ""}`
  ).join("\n\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `Du är en ärlig och skarp coach för Christian Wederbrand.
Christians mål 2026: bli skuldfri och höja kassaflödet via AI, appar, hemsidor, verktyg, föreläsningar och evenemang.
Varumärken: HDL, Hackadittliv, Conversify, Life Is Awesome, Timeless Brick, Hisingen Padel, Frölunda Kampsportcenter.
Returnera ONLY valid compact JSON utan markdown eller backticks.`,
      messages: [{
        role: "user",
        content: `Christian har ${ideas.length} aktiva idéer (Inbox + Next Action). Gör en veckoanalys.

${ideaList}

Returnera exakt detta JSON:
{
  "weekInsight": "2-3 meningar om vad du ser för mönster och vad Christian bör fokusera på den här veckan kopplat till målen",
  "fastestRevenue": "Vilken idé ger snabbast väg till ny intäkt och varför — en mening",
  "top3": [
    {
      "index": 0,
      "reason": "Varför denna idé ska prioriteras den här veckan — en mening"
    }
  ],
  "warning": "En ärlig varning om något du ser — t.ex. för många distractors, för lite fokus på kassaflöde, idéer som ruttnar"
}
top3.index är 0-baserat index i listan ovan. Välj max 3.`,
      }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: err?.error?.message || `HTTP ${res.status}` }),
    };
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text || "";

  // Extrahera JSON
  let parsed;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return { statusCode: 200, body: JSON.stringify({ weekInsight: raw, top3: [], warning: "", fastestRevenue: "" }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  };
};
