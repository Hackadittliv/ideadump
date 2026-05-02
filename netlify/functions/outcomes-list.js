// Listar outcomes för inloggad användare. Klienten mappar dem till sina idéer
// via idea_id (string-id från ideas-arrayen i ideadump_user_data).
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("ideadump_idea_outcomes")
    .select("*")
    .eq("user_id", auth.userId)
    .order("captured_at", { ascending: false });

  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outcomes: data || [] }),
  };
};
