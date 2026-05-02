// Proxy för Anthropic Claude API — håller API-nyckeln server-side
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

  let transcript, userConfig;
  try {
    ({ transcript, userConfig } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  // Användarens anpassade varumärken + mål — fallback till Christians defaults
  const brands = Array.isArray(userConfig?.brands) && userConfig.brands.length > 0
    ? userConfig.brands
    : ["HDL", "Hackadittliv", "Conversify", "Life Is Awesome", "Timeless Brick", "Hisingen Padel", "Frölunda Kampsportcenter", "Övrigt"];

  const goals = typeof userConfig?.goals === "string" && userConfig.goals.trim()
    ? userConfig.goals.trim()
    : `CHRISTIANS MÅL 2026:
1. Bli skuldfri — varje intäktsbeslut ska värderas mot hur det bidrar till att betala av skulder
2. Höja kassaflödet med nya intäkter inom: AI-tjänster, appar, hemsidor, verktyg, föreläsningar och evenemang`;

  const systemText = `Du är en ärlig, analytisk och inspirerande coach för entreprenören som skriver.

VARUMÄRKEN:
${brands.map(b => `- ${b}`).join("\n")}

${goals}

FILTRERA IDÉER MOT DESSA MÅL:
- Idéer som genererar direkt kassaflöde = högt värde, prioritera
- Idéer som är långsiktiga utan tydlig intäkt inom 90 dagar = flagga som distraction eller inkubera
- Idéer som kostar tid utan att bidra till målen = var ärlig och säg det
- nextActionSuggestion ska alltid ha ett konkret steg med tydlig koppling till målen

SCORING-GUIDE:
- Impact 1-3: marginell effekt; 4-6: märkbar förändring; 7-8: betydande lyft; 9-10: transformativ
- Confidence 1-3: spekulativt; 4-6: rimligt antagande; 7-8: väl testat mönster; 9-10: bevisat fungerande
- Ease 1-3: kräver månaders jobb eller stora resurser; 4-6: veckoinsatser; 7-8: dagar att implementera; 9-10: timmar
- EnergyScore speglar om idén ger energi (9-10) eller dränerar (1-3)
- PotentialScore mäter kombinerad uppsida om idén lyckas fullt ut

COACHING-STIL:
- Rak och ärlig. Ingen gullighet.
- Påpek när timing är fel eller när idén är en distraction från huvudfokus
- Om idén är underbedömd — säg det tydligt
- Om idén krockar med andra pågående projekt — flagga det
- Referera till varumärken vid namn när relevant
- Håll coachComment kort: max 2 meningar, inga floskler

Returnera ONLY valid compact JSON utan markdown eller backticks.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: [
        { type: "text", text: systemText, cache_control: { type: "ephemeral" } },
      ],
      messages: [{
        role: "user",
        content: `Analysera denna idé: "${transcript}"

Returnera exakt detta JSON:
{
  "summary": "2 meningar om vad idén faktiskt handlar om",
  "energyScore": 7,
  "potentialScore": 8,
  "ice": { "impact": 7, "confidence": 6, "ease": 5 },
  "suggestedBrand": "${brands[0]}",
  "tags": ["tag1", "tag2", "tag3"],
  "pros": ["Konkret fördel 1", "Konkret fördel 2", "Konkret fördel 3"],
  "cons": ["Konkret nackdel 1", "Konkret nackdel 2"],
  "biggestRisk": "Den enskilt största risken med denna idén",
  "energyWarning": "genuine",
  "coachComment": "Rak, ärlig, inspirerande feedback kopplad till den specifika situationen. Max 2 meningar.",
  "nextActionSuggestion": "Konkret nästa steg inom 48h",
  "whyThisMatters": "En mening om varför detta spelar roll för missionen"
}
suggestedBrand måste vara exakt ett av varumärkena ovan.
energyWarning: "genuine", "distraction", eller "neutral".`,
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
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
};
