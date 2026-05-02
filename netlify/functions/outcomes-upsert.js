// Sparar (eller uppdaterar) en outcome för en idé. En outcome per idé via
// UNIQUE (user_id, idea_id). Validerar att idea_id faktiskt tillhör användaren.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

const ALLOWED_OUTCOMES = ["shipped", "sold", "killed", "stalled", "still_working"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig body." }) }; }

  const { idea_id, outcome, notes } = body;
  if (typeof idea_id !== "string" || !idea_id) {
    return { statusCode: 400, body: JSON.stringify({ error: "idea_id krävs." }) };
  }
  if (!ALLOWED_OUTCOMES.includes(outcome)) {
    return { statusCode: 400, body: JSON.stringify({ error: `outcome måste vara: ${ALLOWED_OUTCOMES.join(", ")}` }) };
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Hämta idén ur user_data för att (a) verifiera ägarskap, (b) snapshotta AI:ns
  // förutsägelser så vi kan korrelera dem mot utfallet senare (rubric-data).
  const { data: ud } = await supabase
    .from("ideadump_user_data")
    .select("data")
    .eq("user_id", auth.userId)
    .single();

  const idea = (ud?.data?.ideas || []).find((i) => i.id === idea_id);
  if (!idea) {
    return { statusCode: 404, body: JSON.stringify({ error: "Idén hittades inte." }) };
  }

  const ai = idea.aiAnalysis || {};
  const ice = ai.ice || {};
  const predicted_ice_total = (ice.impact != null && ice.confidence != null && ice.ease != null)
    ? Number(((ice.impact + ice.confidence + ice.ease) / 3).toFixed(2))
    : null;

  const row = {
    user_id: auth.userId,
    idea_id,
    outcome,
    notes: typeof notes === "string" ? notes.slice(0, 500) : "",
    predicted_warning: ai.energyWarning || null,
    predicted_ice_total,
    captured_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ideadump_idea_outcomes")
    .upsert(row, { onConflict: "user_id,idea_id" })
    .select()
    .single();

  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outcome: data }),
  };
};
