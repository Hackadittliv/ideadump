// Registrerar en webbläsares push-subscription i Supabase
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || "https://wmvxantcujnsathpeqyu.supabase.co";

  if (!serviceKey) {
    return { statusCode: 503, body: JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY saknas." }) };
  }

  let userId, subscription, userAgent;
  try {
    ({ userId, subscription, userAgent } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return { statusCode: 400, body: JSON.stringify({ error: "userId och komplett subscription krävs." }) };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { error } = await supabase
    .from("ideadump_push_subscriptions")
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent || null,
    }, { onConflict: "endpoint" });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
