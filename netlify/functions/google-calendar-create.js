// Skapar ett kalenderevent direkt i Google Calendar åt användaren.
// Använder lagrad refresh_token, förnyar access_token vid behov.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

async function refreshAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("refresh_token ogiltig — logga in igen.");
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return { statusCode: 503, body: JSON.stringify({ error: "Google OAuth ej konfigurerat." }) };
  }

  let bodyUserId, idea, scheduledDate;
  try {
    ({ userId: bodyUserId, idea, scheduledDate } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  if (!idea) {
    return { statusCode: 400, body: JSON.stringify({ error: "idea krävs." }) };
  }

  const auth = await requireUser(event, bodyUserId);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const { data: tokenRow, error: dbErr } = await supabase
    .from("ideadump_google_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (dbErr || !tokenRow) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Ingen Google-koppling hittad. Aktivera i Inställningar först." }),
    };
  }

  // Förnya access_token om det är nära att expirera
  let accessToken = tokenRow.access_token;
  if (new Date(tokenRow.expires_at).getTime() - Date.now() < 2 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;
      await supabase
        .from("ideadump_google_tokens")
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } catch (e) {
      return { statusCode: 401, body: JSON.stringify({ error: e.message }) };
    }
  }

  // Bygg eventet
  const ai = idea.aiAnalysis || {};
  const title = ai.nextActionSuggestion
    ? `💡 [${idea.brand}] ${ai.nextActionSuggestion.slice(0, 80)}`
    : `💡 [${idea.brand}] ${ai.summary?.slice(0, 80) || idea.transcript?.slice(0, 80) || "IdeaDump-idé"}`;

  const descParts = [];
  if (ai.summary) descParts.push(ai.summary);
  if (ai.coachComment) descParts.push("\n💬 " + ai.coachComment);
  if (ai.biggestRisk) descParts.push("\n⚠️ Största risken: " + ai.biggestRisk);
  descParts.push(`\n\n— IdeaDump · ${idea.brand}`);
  const description = descParts.join("\n");

  // Bestäm event-typ:
  // - har deadline → all-day event på deadline-datumet (slipper fake-möten)
  // - ingen deadline men scheduledDate angiven → 30 min block 09:00
  // - inget alls → idag 09:00 (bakåtkompabilitet med befintliga callers)
  const startDay = scheduledDate || idea.deadline || new Date().toISOString().slice(0, 10);
  const isAllDay = !!idea.deadline && !scheduledDate;

  let eventBody;
  if (isAllDay) {
    // All-day i Google Calendar: end.date är dagen EFTER (exklusiv).
    const endDay = new Date(`${startDay}T00:00:00Z`);
    endDay.setUTCDate(endDay.getUTCDate() + 1);
    eventBody = {
      summary: title,
      description,
      start: { date: startDay },
      end: { date: endDay.toISOString().slice(0, 10) },
      reminders: { useDefault: true },
    };
  } else {
    eventBody = {
      summary: title,
      description,
      start: { dateTime: `${startDay}T09:00:00`, timeZone: "Europe/Stockholm" },
      end:   { dateTime: `${startDay}T09:30:00`, timeZone: "Europe/Stockholm" },
      reminders: { useDefault: true },
    };
  }

  // Idempotens: om idén redan har ett eventId, uppdatera det istället
  // för att skapa ett nytt — annars produceras dubletter när användaren
  // bokar om eller flippar status fram och tillbaka.
  const existingEventId = idea.googleEventId;
  const url = existingEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(existingEventId)}`
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events";

  const method = existingEventId ? "PATCH" : "POST";

  let res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  // Om PATCH 404:ar (event raderat i Google) → faila tillbaka till POST
  if (existingEventId && res.status === 404) {
    res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    });
  }

  if (!res.ok) {
    const err = await res.text();
    return { statusCode: res.status, body: JSON.stringify({ error: "Kalenderbokning misslyckades: " + err }) };
  }

  const saved = await res.json();
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      eventId: saved.id,
      htmlLink: saved.htmlLink,
      updated: !!existingEventId && res.status !== 404,
    }),
  };
};
