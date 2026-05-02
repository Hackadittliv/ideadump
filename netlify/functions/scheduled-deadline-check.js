// Körs varje morgon kl 8:00 CET. Två syften:
// 1. Deadline-påminnelse — om något har deadline idag, försenat, eller inom 2 dagar
// 2. Morning-focus — om inga deadlines, push:a EN sak att fokusera på
//    (högst-ICE-idén i status `next` med en konkret nextActionSuggestion)
const { createClient } = require("@supabase/supabase-js");
const webpush = require("web-push");
const { SUPABASE_URL } = require("./_auth");

const OWNER_USER_ID = process.env.IDEADUMP_OWNER_USER_ID;

function iceTotal(idea) {
  const ice = idea?.aiAnalysis?.ice;
  if (!ice || ice.impact == null || ice.confidence == null || ice.ease == null) return 0;
  return (ice.impact + ice.confidence + ice.ease) / 3;
}

function isBlocked(idea, allIdeas) {
  return (idea.dependsOn || []).some((id) => {
    const blocker = allIdeas.find((x) => x.id === id);
    return blocker && blocker.status !== "done";
  });
}

exports.handler = async (event = {}) => {
  // Netlify scheduler invokar utan httpMethod. Publika HTTP-anrop måste ha CRON_SECRET.
  if (event.httpMethod) {
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = event.headers?.["x-cron-secret"] || event.headers?.["X-Cron-Secret"] || "";
    if (!cronSecret || headerSecret !== cronSecret) {
      return { statusCode: 401, body: "Unauthorized" };
    }
  }

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

  let title = "";
  let body = "";
  let url = "https://ideadump.se";

  if (overdue.length > 0) {
    title = `⚠️ ${overdue.length} deadline${overdue.length > 1 ? "s" : ""} har passerat`;
    body = overdue.slice(0, 2).map(i => i.aiAnalysis?.summary?.slice(0, 60) || i.transcript?.slice(0, 60)).join(" · ");
  } else if (dueToday.length > 0) {
    title = `📅 ${dueToday.length} deadline${dueToday.length > 1 ? "s" : ""} idag`;
    body = dueToday.slice(0, 2).map(i => i.aiAnalysis?.summary?.slice(0, 60) || i.transcript?.slice(0, 60)).join(" · ");
  } else if (dueSoon.length > 0) {
    title = `🔔 ${dueSoon.length} deadline${dueSoon.length > 1 ? "s" : ""} inom 2 dagar`;
    body = dueSoon.slice(0, 2).map(i => i.aiAnalysis?.summary?.slice(0, 60) || i.transcript?.slice(0, 60)).join(" · ");
  } else {
    // Morning-focus: inga deadlines → välj högst-ICE från `next`-stacken som
    // har ett konkret nextActionSuggestion. Push:a EN sak att fokusera på.
    const candidates = ideas
      .filter(i => i.status === "next"
        && i.aiAnalysis?.nextActionSuggestion
        && !isBlocked(i, ideas))
      .sort((a, b) => iceTotal(b) - iceTotal(a));

    const focus = candidates[0];
    if (!focus) {
      return { statusCode: 200, body: "Inga deadlines, inga next actions" };
    }

    title = `🎯 Idag · ${focus.brand}`;
    body = focus.aiAnalysis.nextActionSuggestion.slice(0, 110);
  }

  const { data: subs } = await supabase
    .from("ideadump_push_subscriptions")
    .select("*")
    .eq("user_id", OWNER_USER_ID);

  if (!subs || subs.length === 0) return { statusCode: 200, body: "Inga prenumerationer" };

  const payload = JSON.stringify({ title, body, url });

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
