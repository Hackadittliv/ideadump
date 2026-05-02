// Hjälpare för agent-skills (återanvändbara prompt-fragment).
// Matchar enabled skills mot transcript+brand och formaterar dem som
// instruktion-block i system-prompten.
const { createClient } = require("@supabase/supabase-js");
const { SUPABASE_URL } = require("./_auth");
const { wrapStoredContent } = require("./_llm");

const MAX_PER_ANALYSIS = 5;
const MAX_FRAGMENT_CHARS = 400;

// Plockar relevanta skills för en idé. brand kan vara null (ingen aning).
async function loadRelevantSkills(userId, { transcript = "", brand = null } = {}) {
  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from("ideadump_agent_skills")
    .select("id, name, prompt_fragment, trigger_type, trigger_value, brand")
    .eq("user_id", userId)
    .eq("enabled", true)
    .limit(50);

  if (error) {
    console.error("[skills] load error:", error.message);
    return [];
  }

  const lowerTranscript = transcript.toLowerCase();
  const matched = [];

  for (const s of data || []) {
    if (matched.length >= MAX_PER_ANALYSIS) break;

    // Brand-skill: skippa om brand är känd och inte matchar.
    // Om brand är okänd: ta med (då vet vi inte; bättre lite för mycket kontext).
    if (s.brand && brand && s.brand !== brand) continue;

    let isMatch = false;
    if (s.trigger_type === "always") {
      isMatch = true;
    } else if (s.trigger_type === "brand") {
      isMatch = !brand || s.trigger_value === brand;
    } else if (s.trigger_type === "keyword") {
      const kw = (s.trigger_value || "").toLowerCase().trim();
      isMatch = kw && lowerTranscript.includes(kw);
    }

    if (isMatch) matched.push(s);
  }

  return matched;
}

function formatSkillsBlock(skills) {
  if (!skills.length) return "";
  const lines = skills.map((s) => {
    const fragment = String(s.prompt_fragment || "").slice(0, MAX_FRAGMENT_CHARS);
    return `### ${s.name}\n${wrapStoredContent("skill", fragment)}`;
  });
  return `AGENT-TEKNIKER (playbooks användaren vill att du tillämpar när relevant):
${lines.join("\n\n")}`;
}

async function markSkillsUsed(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase
    .from("ideadump_agent_skills")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", ids);
}

module.exports = { loadRelevantSkills, formatSkillsBlock, markSkillsUsed };
