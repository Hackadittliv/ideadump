// Bildanalys — Claude Vision läser whiteboard/anteckningar/skärmdumpar och extraherar idén
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

  let imageBase64, mediaType, note;
  try {
    ({ imageBase64, mediaType, note } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  if (!imageBase64 || !mediaType) {
    return { statusCode: 400, body: JSON.stringify({ error: "imageBase64 och mediaType krävs." }) };
  }

  const userContent = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: imageBase64,
      },
    },
    {
      type: "text",
      text: `Läs bilden och extrahera idén som text. Bilden kan vara en whiteboard, servettsanteckning, skärmdump, skiss, handskrift eller maskinskriven text.${note ? `\n\nChristians egen kommentar till bilden: "${note}"` : ""}

Returnera enbart den sammanfattade idén som vanlig text på svenska — inget JSON, inga rubriker. Som om Christian själv hade dikterat idén i röstinspelning. Max 3 meningar som täcker kärnan av vad bilden/anteckningen handlar om.`,
    },
  ];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: userContent }],
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
  const text = data.content?.[0]?.text?.trim() || "";

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  };
};
