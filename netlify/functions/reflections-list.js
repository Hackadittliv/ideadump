// Listar användarens reflections (alla statusar). Frontend filtrerar i UI.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data, error } = await supabase
    .from("ideadump_user_reflections")
    .select("*")
    .eq("user_id", auth.userId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reflections: data || [] }),
  };
};
