// Föreslår en lärdom (reflection) baserat på en specifik idé.
// Sparar som status='pending' så användaren kan godkänna i Lärdomar-vyn.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");
const { wrapUserContent, wrapStoredContent, PROMPT_INJECTION_GUARD } = require("./_llm");

const ALLOWED_TYPES = ["pattern", "preference", "constraint", "anti_pattern", "goal_shift"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 503, body: JSON.stringify({ error: "ANTHROPIC_API_KEY saknas." }) };
  }

  let idea_id;
  try { ({ idea_id } = JSON.parse(event.body)); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig body." }) }; }

  if (typeof idea_id !== "string" || !idea_id) {
    return { statusCode: 400, body: JSON.stringify({ error: "idea_id krävs." }) };
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Hämta idén + verifiera ägarskap
  const { data: ud } = await supabase
    .from("ideadump_user_data")
    .select("data")
    .eq("user_id", auth.userId)
    .single();

  const idea = (ud?.data?.ideas || []).find((i) => i.id === idea_id);
  if (!idea) {
    return { statusCode: 404, body: JSON.stringify({ error: "Idén hittades inte." }) };
  }

  // 2. Hämta befintliga reflections (så vi inte föreslår dubletter)
  const { data: existing } = await supabase
    .from("ideadump_user_reflections")
    .select("id, type, statement")
    .eq("user_id", auth.userId)
    .in("status", ["active", "pinned", "pending"])
    .limit(20);

  const existingBlock = (existing || [])
    .map((r) => `- ${r.type}: ${wrapStoredContent("reflection", r.statement)}`)
    .join("\n") || "(inga)";

  const ai = idea.aiAnalysis || {};
  const ideaSummary = `Brand: ${idea.brand || "Övrigt"}
Status: ${idea.status}
Transcript: ${idea.transcript || ""}
Analys: ${ai.summary || ""}
ICE: I=${ai.ice?.impact || "?"} C=${ai.ice?.confidence || "?"} E=${ai.ice?.ease || "?"}
EnergyWarning: ${ai.energyWarning || "?"}
Coach: ${ai.coachComment || ""}`;

  // 3. Anropa Claude — be om EN lärdom eller "ingen tydlig"
  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `Du är en analytiker som identifierar EN konkret, falsifierbar lärdom om en entreprenörs beteende — baserat på en enskild idé och dess analys.

REGLER:
- Föreslå MAX 1 lärdom. Om inget mönster är tydligt nog, returnera { "skip": true, "reason": "..." }.
- Lärdomen ska vara en hypotes (ej fakta), specifik, åtgärdbar.
- Får INTE vara en dubblett av befintliga lärdomar nedan.
- Får INTE vara generisk ("användaren är produktiv").
- Skriv på svenska.

${PROMPT_INJECTION_GUARD}

Returnera ENDAST valid JSON utan markdown.`,
      messages: [{
        role: "user",
        content: `Befintliga lärdomar:
${existingBlock}

Idén att analysera:
${wrapUserContent("idea", ideaSummary)}

Returnera EXAKT detta JSON:
{
  "skip": false,
  "type": "pattern",
  "statement": "Konkret hypotes max 200 tecken",
  "confidence": 0.6
}
type måste vara: pattern, preference, constraint, anti_pattern, eller goal_shift.
Om ingen tydlig lärdom: { "skip": true, "reason": "kort förklaring" }`,
      }],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    console.error("[suggest-from-idea] Claude-fel:", claudeRes.status, err);
    return { statusCode: 502, body: JSON.stringify({ error: "Claude svarade inte." }) };
  }

  const cd = await claudeRes.json();
  const raw = cd.content?.[0]?.text || "";
  let parsed;
  try {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    parsed = JSON.parse(raw.slice(s, e + 1));
  } catch {
    return { statusCode: 502, body: JSON.stringify({ error: "Kunde inte tolka Claude-svaret." }) };
  }

  if (parsed.skip) {
    return {
      statusCode: 200,
      body: JSON.stringify({ skipped: true, reason: parsed.reason || "Ingen tydlig lärdom." }),
    };
  }

  if (!ALLOWED_TYPES.includes(parsed.type) || typeof parsed.statement !== "string" || parsed.statement.trim().length < 5) {
    return { statusCode: 502, body: JSON.stringify({ error: "Felaktigt format på förslaget." }) };
  }

  // 4. Spara som pending, brand = idéns brand (lokalt scope)
  const { data: inserted, error: insErr } = await supabase
    .from("ideadump_user_reflections")
    .insert({
      user_id: auth.userId,
      type: parsed.type,
      statement: parsed.statement.trim().slice(0, 500),
      brand: idea.brand || null,
      evidence_idea_ids: [idea.id],
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5)),
      status: "pending",
      source: "idea_suggestion",
    })
    .select()
    .single();

  if (insErr) {
    return { statusCode: 500, body: JSON.stringify({ error: insErr.message }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reflection: inserted }),
  };
};
