// Skapa eller uppdatera en reflection. Klient kan inte ändra user_id eller source.
// För nya rader (utan id) sätts source='manual' och status='active' default.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

const ALLOWED_TYPES = ["pattern", "preference", "constraint", "anti_pattern", "goal_shift"];
const ALLOWED_STATUSES = ["active", "pending", "archived", "pinned"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig body." }) }; }

  const { id, type, statement, status, evidence_idea_ids } = body;
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return { statusCode: 400, body: JSON.stringify({ error: `type måste vara en av: ${ALLOWED_TYPES.join(", ")}` }) };
  }
  if (typeof statement !== "string" || statement.trim().length < 3) {
    return { statusCode: 400, body: JSON.stringify({ error: "statement krävs (minst 3 tecken)." }) };
  }
  if (status && !ALLOWED_STATUSES.includes(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: `status måste vara en av: ${ALLOWED_STATUSES.join(", ")}` }) };
  }

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const row = {
    user_id: auth.userId,
    type,
    statement: statement.trim().slice(0, 500),
    status: status || "active",
    evidence_idea_ids: Array.isArray(evidence_idea_ids) ? evidence_idea_ids.slice(0, 20) : [],
    updated_at: new Date().toISOString(),
  };

  let result;
  if (id) {
    // Uppdatera bara om raden tillhör user_id (extra skydd utöver RLS)
    const { data, error } = await supabase
      .from("ideadump_user_reflections")
      .update(row)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .maybeSingle();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    if (!data) return { statusCode: 404, body: JSON.stringify({ error: "Reflection hittades inte." }) };
    result = data;
  } else {
    row.source = "manual";
    const { data, error } = await supabase
      .from("ideadump_user_reflections")
      .insert(row)
      .select()
      .single();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    result = data;
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reflection: result }),
  };
};
