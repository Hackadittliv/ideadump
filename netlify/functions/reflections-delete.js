// Radera reflection. RLS skyddar att bara ägaren kan radera, men vi
// dubbelkollar user_id för säkerhets skull.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  let id;
  try { ({ id } = JSON.parse(event.body)); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig body." }) }; }

  if (!id) return { statusCode: 400, body: JSON.stringify({ error: "id krävs." }) };

  const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from("ideadump_user_reflections")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
