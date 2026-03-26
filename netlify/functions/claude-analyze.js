// Proxy för Anthropic Claude API — håller API-nyckeln server-side
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

  let transcript;
  try {
    ({ transcript } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

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
      system: `Du är en ärlig, analytisk och inspirerande coach för Christian Wederbrand.
Christian är Göteborgsbaserad entreprenör med varumärkena:
- HDL (Hacka Ditt Liv): personlig utveckling, coaching, podcast, rörelse, ultramarathon, community
- Conversify: AI-webbyrå och automationsbolag
- Life Is Awesome: longevity, wellness, Rörelsefestivalen (maj 2026)
- Timeless Brick: digital byrå

Du är rak och ärlig. Du påpekar när en idé är en distraction, när den är underbedömd, eller när timing är fel.
Returnera ONLY valid compact JSON utan markdown eller backticks.`,
      messages: [{
        role: "user",
        content: `Analysera denna idé från Christian: "${transcript}"

Returnera exakt detta JSON:
{
  "summary": "2 meningar om vad idén faktiskt handlar om",
  "energyScore": 7,
  "potentialScore": 8,
  "ice": { "impact": 7, "confidence": 6, "ease": 5 },
  "suggestedBrand": "HDL",
  "tags": ["tag1", "tag2", "tag3"],
  "pros": ["Konkret fördel 1", "Konkret fördel 2", "Konkret fördel 3"],
  "cons": ["Konkret nackdel 1", "Konkret nackdel 2"],
  "biggestRisk": "Den enskilt största risken med denna idén",
  "energyWarning": "genuine",
  "coachComment": "Rak, ärlig, inspirerande feedback kopplad till Christians specifika situation. Max 2 meningar.",
  "nextActionSuggestion": "Konkret nästa steg inom 48h",
  "whyThisMatters": "En mening om varför detta spelar roll för Christians mission"
}
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
