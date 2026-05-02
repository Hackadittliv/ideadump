// Hämtar aktiva/pinnade reflections för en user och formaterar dem som
// kontext-block för LLM-prompts. Pending och archived inkluderas inte.
const { createClient } = require("@supabase/supabase-js");
const { SUPABASE_URL } = require("./_auth");

const TYPE_LABEL = {
  pattern: "Mönster",
  preference: "Preferens",
  constraint: "Begränsning",
  anti_pattern: "Anti-mönster (undvik)",
  goal_shift: "Mål-skift",
};

async function loadActiveReflections(userId) {
  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("ideadump_user_reflections")
    .select("type, statement, status")
    .eq("user_id", userId)
    .in("status", ["active", "pinned"])
    .order("status", { ascending: false }) // pinned först
    .limit(30);

  if (error) {
    console.error("[reflections] load error:", error.message);
    return [];
  }
  return data || [];
}

// Formatera som textblock för system-prompt
function formatReflectionsBlock(reflections) {
  if (!reflections.length) return "";
  const lines = reflections.map((r) => {
    const label = TYPE_LABEL[r.type] || r.type;
    const pin = r.status === "pinned" ? " [PRIORITERAD]" : "";
    return `- ${label}${pin}: ${r.statement}`;
  });
  return `LÄRDOMAR OM ANVÄNDAREN (sparade över tid, använd som kontext):
${lines.join("\n")}

OBS: Lärdomarna är hypoteser, inte absolut sanning. Om en ny idé tydligt motsäger ett mönster — flagga det istället för att blint följa mönstret. Coachens jobb är att utmana, inte bekräfta.`;
}

// Markera reflections som "använda" så de inte arkiveras pga inaktivitet
async function markUsed(userId) {
  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase
    .from("ideadump_user_reflections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("status", ["active", "pinned"]);
}

module.exports = { loadActiveReflections, formatReflectionsBlock, markUsed };
