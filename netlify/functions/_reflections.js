// Hämtar aktiva/pinnade reflections för en user och formaterar dem som
// kontext-block för LLM-prompts. Pending och archived inkluderas inte.
const { createClient } = require("@supabase/supabase-js");
const { SUPABASE_URL } = require("./_auth");
const { wrapStoredContent } = require("./_llm");

const TYPE_LABEL = {
  pattern: "Mönster",
  preference: "Preferens",
  constraint: "Begränsning",
  anti_pattern: "Anti-mönster (undvik)",
  goal_shift: "Mål-skift",
};

// brand = null → globala lärdomar; brand = "HDL" → matchar brand ELLER globala.
async function loadActiveReflections(userId, { brand } = {}) {
  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  let query = supabase
    .from("ideadump_user_reflections")
    .select("id, type, statement, status, brand")
    .eq("user_id", userId)
    .in("status", ["active", "pinned"]);

  if (brand) {
    query = query.or(`brand.is.null,brand.eq.${brand}`);
  }

  const { data, error } = await query
    .order("status", { ascending: false }) // pinned först
    .limit(30);

  if (error) {
    console.error("[reflections] load error:", error.message);
    return [];
  }
  return data || [];
}

// Formatera som textblock för system-prompt — varje statement wrappas så
// att modellen inte kan luras av instruktioner inuti en reflection.
function formatReflectionsBlock(reflections) {
  if (!reflections.length) return "";
  const lines = reflections.map((r) => {
    const label = TYPE_LABEL[r.type] || r.type;
    const pin = r.status === "pinned" ? " [PRIORITERAD]" : "";
    const scope = r.brand ? ` [${r.brand}]` : "";
    return `- ${label}${pin}${scope}: ${wrapStoredContent("reflection", r.statement)}`;
  });
  return `LÄRDOMAR OM ANVÄNDAREN (sparade över tid, använd som kontext):
${lines.join("\n")}

OBS: Lärdomarna är hypoteser, inte absolut sanning. Om en ny idé tydligt motsäger ett mönster — flagga det istället för att blint följa mönstret. Coachens jobb är att utmana, inte bekräfta.`;
}

// Markera bara de reflections som faktiskt laddades, så last_used_at
// reflekterar verklig användning (inte bara att en analys kördes).
async function markUsed(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase
    .from("ideadump_user_reflections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", ids);
}

module.exports = { loadActiveReflections, formatReflectionsBlock, markUsed };
