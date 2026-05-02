// Kollar om användaren har kopplat Google Calendar.
// Servern har service-role key som bypassar RLS; frontend har inte.
const { createClient } = require("@supabase/supabase-js");
const { requireUser } = require("./_auth");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wmvxantcujnsathpeqyu.supabase.co";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return { statusCode: 503, body: JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY saknas." }) };
  }

  let bodyUserId, action;
  try {
    ({ userId: bodyUserId, action } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig body." }) };
  }

  const auth = await requireUser(event, bodyUserId);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  const supabase = createClient(SUPABASE_URL, serviceKey);

  if (action === "disconnect") {
    const { error } = await supabase
      .from("ideadump_google_tokens")
      .delete()
      .eq("user_id", userId);
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  const { data, error } = await supabase
    .from("ideadump_google_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ connected: !!data }) };
};
