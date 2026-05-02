// Registrerar en webbläsares push-subscription i Supabase
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return { statusCode: 503, body: JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY saknas." }) };
  }

  let bodyUserId, subscription, userAgent;
  try {
    ({ userId: bodyUserId, subscription, userAgent } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return { statusCode: 400, body: JSON.stringify({ error: "Komplett subscription krävs." }) };
  }

  const auth = await requireUser(event, bodyUserId);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  const supabase = createClient(SUPABASE_URL, serviceKey);

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
