// Proxy för OpenAI Whisper API — håller API-nyckeln server-side
// Klienten skickar ljudet som base64-kodad JSON
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "OPENAI_API_KEY saknas i Netlify-miljövariablerna." }),
    };
  }

  let audio, mimeType;
  try {
    ({ audio, mimeType } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  const buffer = Buffer.from(audio, "base64");
  const blob = new Blob([buffer], { type: mimeType || "audio/webm" });

  const formData = new FormData();
  formData.append("file", blob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("language", "sv");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
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
