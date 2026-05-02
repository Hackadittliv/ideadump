// Arkiverar reflections som inte används aktivt:
// - status = 'active' (lämna pinned ifred — användaren har explicit prioriterat dem)
// - last_used_at är NULL eller äldre än 60 dagar
// - created_at äldre än 30 dagar (ge nya reflections en chans innan vi pratar bort dem)
// Förhindrar att Claude coachar utifrån föråldrade mönster när idé-mängden växer.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const cutoffUsed = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  const cutoffCreated = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  // Två separata queries: aldrig använd OCH gammal, eller använd för länge sedan
  const { data: neverUsed } = await supabase
    .from("ideadump_user_reflections")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .is("last_used_at", null)
    .lt("created_at", cutoffCreated);

  const { data: longUnused } = await supabase
    .from("ideadump_user_reflections")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .lt("last_used_at", cutoffUsed);

  const ids = Array.from(new Set([
    ...(neverUsed || []).map((r) => r.id),
    ...(longUnused || []).map((r) => r.id),
  ]));

  if (ids.length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({ archived: 0 }),
    };
  }

  const { error: updErr } = await supabase
    .from("ideadump_user_reflections")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", auth.userId);

  if (updErr) {
    return { statusCode: 500, body: JSON.stringify({ error: updErr.message }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archived: ids.length }),
  };
};
