// Veckoanalys — Claude sammanfattar Inbox + Next Action och pekar ut veckans prioriteringar
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
      system: [
        {
          type: "text",
          text: `Du är en ärlig och skarp coach för Christian Wederbrand.

CHRISTIANS KONTEXT:
Göteborgsbaserad entreprenör med flera varumärken — HDL (Hacka Ditt Liv, personlig utveckling + rörelse + community), Hackadittliv (plattform), Conversify (AI-byrå), Life Is Awesome (longevity + Rörelsefestivalen maj 2026), Timeless Brick (digital byrå), Hisingen Padel, Frölunda Kampsportcenter.

CHRISTIANS MÅL 2026:
1. Bli skuldfri — varje vecka ska röra sig mot mindre skuld
2. Höja kassaflödet via AI-tjänster, appar, hemsidor, verktyg, föreläsningar och evenemang

VECKOANALYS-PRINCIPER:
- Fokusera på MÖNSTER över tid, inte enstaka idéer
- Hitta flaskhalsar: vad blockerar Christian från att exekvera?
- Identifiera distraction-kluster: om flera idéer pekar bort från huvudmålet — säg det
- Hitta synergi-idéer: vilka två idéer kan kombineras för att spara tid
- fastestRevenue ska vara konkret och realistisk inom 7-14 dagar
- top3 ska balansera "snabbaste pengarna" med "viktigaste grunden"
- warning är där du är brutalt ärlig — ingen sockerputsning

COACHING-TON:
- Rak, kort, inga onödiga ord
- Använd Christians namn direkt
- Referera till specifika varumärken
- Om idéer ruttnar i inbox — påpek det
- Om han jagar för många bollar — påpek det

Returnera ONLY valid compact JSON utan markdown eller backticks.`,
          cache_control: { type: "ephemeral" },
        },
      ],
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
