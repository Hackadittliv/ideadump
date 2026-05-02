const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("ideadump_agent_skills")
    .select("*")
    .eq("user_id", auth.userId)
    .order("enabled", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills: data || [] }),
  };
};
