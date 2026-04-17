// Körs varje morgon kl 8:00 CET. Skickar push om deadlines försvinner eller passerar idag.
const { createClient } = require("@supabase/supabase-js");
const webpush = require("web-push");

const OWNER_USER_ID = process.env.IDEADUMP_OWNER_USER_ID;
const SUPABASE_URL = process.env.SUPABASE_URL || "https://wmvxantcujnsathpeqyu.supabase.co";

exports.handler = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPub = process.env.VAPID_PUBLIC_KEY;
  const vapidPriv = process.env.VAPID_PRIVATE_KEY;

  if (!serviceKey || !vapidPub || !vapidPriv || !OWNER_USER_ID) {
    return { statusCode: 503, body: "Missing env vars" };
  }

  webpush.setVapidDetails("mailto:hej@ideadump.se", vapidPub, vapidPriv);
  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: row } = await supabase
    .from("ideadump_user_data")
    .select("data")
    .eq("user_id", OWNER_USER_ID)
    .single();

  const ideas = row?.data?.ideas || [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in2days = new Date(now.getTime() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const overdue = ideas.filter(i =>
    i.deadline && i.deadline < today && i.status !== "done"
  );
  const dueToday = ideas.filter(i =>
    i.deadline && i.deadline === today && i.status !== "done"
  );
  const dueSoon = ideas.filter(i =>
    i.deadline && i.deadline > today && i.deadline <= in2days && i.status !== "done"
  );

  if (overdue.length === 0 && dueToday.length === 0 && dueSoon.length === 0) {
    return { statusCode: 200, body: "Inga deadlines idag" };
  }

  let title = "";
  let body = "";
  if (overdue.length > 0) {
    title = `⚠️ ${overdue.length} deadline${overdue.length > 1 ? "s" : ""} har passerat`;
    body = overdue.slice(0, 2).map(i => i.aiAnalysis?.summary?.slice(0, 60) || i.transcript?.slice(0, 60)).join(" · ");
  } else if (dueToday.length > 0) {
    title = `📅 ${dueToday.length} deadline${dueToday.length > 1 ? "s" : ""} idag`;
    body = dueToday.slice(0, 2).map(i => i.aiAnalysis?.summary?.slice(0, 60) || i.transcript?.slice(0, 60)).join(" · ");
  } else {
    title = `🔔 ${dueSoon.length} deadline${dueSoon.length > 1 ? "s" : ""} inom 2 dagar`;
    body = dueSoon.slice(0, 2).map(i => i.aiAnalysis?.summary?.slice(0, 60) || i.transcript?.slice(0, 60)).join(" · ");
  }

  const { data: subs } = await supabase
    .from("ideadump_push_subscriptions")
    .select("*")
    .eq("user_id", OWNER_USER_ID);

  if (!subs || subs.length === 0) return { statusCode: 200, body: "Inga prenumerationer" };

  const payload = JSON.stringify({ title, body, url: "https://ideadump.se" });

  const results = await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payload);
        return true;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("ideadump_push_subscriptions").delete().eq("endpoint", s.endpoint);
        }
        return false;
      }
    })
  );

  return { statusCode: 200, body: JSON.stringify({ sent: results.filter(r => r.status === "fulfilled" && r.value).length }) };
};
