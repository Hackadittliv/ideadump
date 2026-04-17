// Skickar push-notifikation till alla registrerade endpoints för en user_id
const { createClient } = require("@supabase/supabase-js");
const webpush = require("web-push");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPub = process.env.VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || "https://wmvxantcujnsathpeqyu.supabase.co";

  if (!serviceKey || !vapidPub || !vapidPriv) {
    return { statusCode: 503, body: JSON.stringify({ error: "Env vars saknas (SUPABASE_SERVICE_ROLE_KEY, VAPID_*)." }) };
  }

  webpush.setVapidDetails("mailto:hej@ideadump.se", vapidPub, vapidPriv);

  let userId, title, body, url;
  try {
    ({ userId, title, body, url } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  if (!userId || !title) {
    return { statusCode: 400, body: JSON.stringify({ error: "userId och title krävs." }) };
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: subs, error } = await supabase
    .from("ideadump_push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  if (!subs || subs.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ sent: 0, message: "Inga subscriptions." }) };
  }

  const payload = JSON.stringify({
    title,
    body: body || "",
    url: url || "https://ideadump.se",
  });

  const results = await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payload);
        return { endpoint: s.endpoint, ok: true };
      } catch (err) {
        // 404/410 = prenumerationen är expirerad, rensa den
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase
            .from("ideadump_push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint);
        }
        return { endpoint: s.endpoint, ok: false, error: err.message };
      }
    })
  );

  const sent = results.filter(r => r.status === "fulfilled" && r.value.ok).length;
  return { statusCode: 200, body: JSON.stringify({ sent, total: subs.length }) };
};
