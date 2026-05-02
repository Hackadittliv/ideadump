// Decision pressure 2.0 — gör tysta avfall till synlig skuld.
// Idéer med Claude-föreslagen revenue-handling som inte fått ett "✓ Gjorde
// det"-kvitto inom 7 dagar auto-markeras som abandoned + flyttas till park.
// Banner i Vecka-fliken visar nyligen parkerade så Christian ser kostnaden
// av icke-handling.
const { createClient } = require("@supabase/supabase-js");
const { SUPABASE_URL } = require("./_auth");

const OWNER_USER_ID = process.env.IDEADUMP_OWNER_USER_ID;
const STALE_DAYS = 7;
const ABANDON_NOTE = "Auto: 7 dagar utan utförande";

function hasActionableRevenue(idea) {
  const ra = idea?.aiAnalysis?.revenueAction;
  return ra && ra.type && ra.type !== "no_action" && ra.description;
}

exports.handler = async (event = {}) => {
  if (event.httpMethod) {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = event.headers?.["x-cron-secret"] || event.headers?.["X-Cron-Secret"] || "";
    if (!cronSecret || headerSecret !== cronSecret) {
      return { statusCode: 401, body: "Unauthorized" };
    }
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !OWNER_USER_ID) {
    return { statusCode: 503, body: "Missing env vars" };
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const { data: row, error: dbErr } = await supabase
    .from("ideadump_user_data")
    .select("data")
    .eq("user_id", OWNER_USER_ID)
    .single();

  if (dbErr || !row?.data?.ideas) {
    console.error("[revenue-sweep] kunde inte läsa idéer:", dbErr);
    return { statusCode: 500, body: "Failed to load ideas" };
  }

  const ideas = row.data.ideas;
  const now = new Date();
  const cutoff = new Date(now.getTime() - STALE_DAYS * 24 * 3600 * 1000);

  let sweptCount = 0;
  const sweptSummaries = [];

  const updated = ideas.map((idea) => {
    if (!hasActionableRevenue(idea)) return idea;
    const status = idea.revenueActionStatus;
    if (status === "done" || status === "abandoned") return idea;

    // Använd updatedAt om finns, annars createdAt — undvik att svepa idéer
    // som rörts senaste 7 dagarna även om revenue-handlingen inte ändrats.
    const reference = idea.updatedAt || idea.createdAt;
    if (!reference || new Date(reference) > cutoff) return idea;

    sweptCount++;
    sweptSummaries.push((idea.aiAnalysis?.summary || idea.transcript || "").slice(0, 60));
    return {
      ...idea,
      status: "park",
      revenueActionStatus: "abandoned",
      revenueOutcome: {
        revenueSek: null,
        note: ABANDON_NOTE,
        completedAt: now.toISOString(),
      },
      updatedAt: now.toISOString(),
    };
  });

  if (sweptCount === 0) {
    return { statusCode: 200, body: "Inga stale revenue-handlingar" };
  }

  const { error: writeErr } = await supabase
    .from("ideadump_user_data")
    .upsert({
      user_id: OWNER_USER_ID,
      data: { ...row.data, ideas: updated },
      updated_at: now.toISOString(),
    });

  if (writeErr) {
    console.error("[revenue-sweep] write error:", writeErr.message);
    return { statusCode: 500, body: "Write failed" };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      swept: sweptCount,
      examples: sweptSummaries.slice(0, 3),
    }),
  };
};
