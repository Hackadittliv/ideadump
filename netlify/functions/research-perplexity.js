// Perplexity Sonar — search-augmented LLM med synthesised svar + citations.
// Bra för Q&A-style frågor: "vad är aktuellt pris för X", "hur ser marknaden ut".
//
// Body: { query: string, model?: string }
// Response: { provider:"perplexity", answer: string, citations: [{title,url}] }
const { requireUser } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "PERPLEXITY_API_KEY saknas i Netlify-miljövariablerna." }),
    };
  }

  let query, model;
  try {
    ({ query, model = "sonar-pro" } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }
  if (!query || typeof query !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "query (string) krävs." }) };
  }

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Du är en kortfattad researchassistent. Svara på svenska. Ge konkreta fakta med källhänvisningar. Max 6 meningar.",
        },
        { role: "user", content: query },
      ],
      temperature: 0.2,
      max_tokens: 700,
      return_citations: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return {
      statusCode: res.status,
      body: JSON.stringify({ error: `Perplexity API ${res.status}: ${err.slice(0, 300)}` }),
    };
  }

  const data = await res.json();
  const answer = data.choices?.[0]?.message?.content || "";
  // Perplexity returnerar citations som array av URLer (string), inte objekt
  const citations = (data.citations || []).map((url, i) => ({
    title: `Källa ${i + 1}`,
    url: typeof url === "string" ? url : url?.url || "",
  }));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "perplexity", answer, citations }),
  };
};
