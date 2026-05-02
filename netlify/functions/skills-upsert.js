const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

const ALLOWED_TRIGGERS = ["always", "keyword", "brand"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig body." }) }; }

  const { id, name, when_to_use, prompt_fragment, trigger_type, trigger_value, brand, enabled } = body;

  if (typeof name !== "string" || name.trim().length < 2) {
    return { statusCode: 400, body: JSON.stringify({ error: "name krävs (minst 2 tecken)." }) };
  }
  if (typeof prompt_fragment !== "string" || prompt_fragment.trim().length < 5) {
    return { statusCode: 400, body: JSON.stringify({ error: "prompt_fragment krävs (minst 5 tecken)." }) };
  }
  const tt = ALLOWED_TRIGGERS.includes(trigger_type) ? trigger_type : "always";

  const row = {
    user_id: auth.userId,
    name: name.trim().slice(0, 100),
    when_to_use: typeof when_to_use === "string" ? when_to_use.trim().slice(0, 300) : "",
    prompt_fragment: prompt_fragment.trim().slice(0, 1000),
    trigger_type: tt,
    trigger_value: typeof trigger_value === "string" ? trigger_value.trim().slice(0, 100) : "",
    brand: typeof brand === "string" && brand.trim() ? brand.trim().slice(0, 50) : null,
    enabled: enabled === false ? false : true,
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let result;
  if (id) {
    const { data, error } = await supabase
      .from("ideadump_agent_skills")
      .update(row)
      .eq("id", id)
      .eq("user_id", auth.userId)
      .select()
      .maybeSingle();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    if (!data) return { statusCode: 404, body: JSON.stringify({ error: "Skill hittades inte." }) };
    result = data;
  } else {
    const { data, error } = await supabase
      .from("ideadump_agent_skills")
      .insert(row)
      .select()
      .single();
    if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    result = data;
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skill: result }),
  };
};
