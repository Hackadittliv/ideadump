// Schemalagd söndagsgenomgång — körs varje söndag kl 18:00 CET
// Hämtar aktiva idéer från Supabase, kör Claude-analys, mailar resultatet.
// Konfigureras via netlify.toml [[functions."scheduled-weekly-review"]] schedule
const { createClient } = require("@supabase/supabase-js");

// Hårdkodat till Christians user_id i Supabase — mail går bara till honom.
const OWNER_USER_ID = process.env.IDEADUMP_OWNER_USER_ID;
const OWNER_EMAIL = process.env.IDEADUMP_OWNER_EMAIL || "lillen75@gmail.com";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://wmvxantcujnsathpeqyu.supabase.co";

exports.handler = async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !resendKey || !serviceKey || !OWNER_USER_ID) {
    console.error("scheduled-weekly-review: saknade env-variabler", {
      hasAnthropic: !!apiKey,
      hasResend: !!resendKey,
      hasService: !!serviceKey,
      hasOwnerId: !!OWNER_USER_ID,
    });
    return { statusCode: 503, body: "Missing env vars" };
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);

  // 1. Hämta senaste idé-snapshoten
  const { data: row, error: dbErr } = await supabase
    .from("ideadump_user_data")
    .select("data, updated_at")
    .eq("user_id", OWNER_USER_ID)
    .single();
  if (dbErr || !row?.data?.ideas) {
    console.error("scheduled-weekly-review: kunde inte läsa idéer", dbErr);
    return { statusCode: 500, body: "Failed to load ideas" };
  }

  const allIdeas = row.data.ideas || [];
  const isBlocked = (idea) => (idea.dependsOn || []).some(id => {
    const b = allIdeas.find(x => x.id === id);
    return b && b.status !== "done";
  });
  const activeIdeas = allIdeas.filter(i =>
    (i.status === "inbox" || i.status === "next") && !isBlocked(i)
  );

  if (activeIdeas.length === 0) {
    console.log("scheduled-weekly-review: inga aktiva idéer, skippar");
    return { statusCode: 200, body: "No active ideas" };
  }

  // 2. Kör weekly-review-prompten
  const ideaList = activeIdeas.map((idea, i) =>
    `${i + 1}. [${idea.brand}] ${idea.aiAnalysis?.summary || idea.transcript?.slice(0, 100)}
   ICE: ${idea.aiAnalysis ? ((idea.aiAnalysis.ice?.impact + idea.aiAnalysis.ice?.confidence + idea.aiAnalysis.ice?.ease) / 3).toFixed(1) : "?"} | Status: ${idea.status} | Skapad: ${new Date(idea.createdAt).toLocaleDateString("sv-SE")}${idea.deadline ? ` | Deadline: ${idea.deadline}` : ""}`
  ).join("\n\n");

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: [{
        type: "text",
        cache_control: { type: "ephemeral" },
        text: `Du är en ärlig och skarp coach för Christian Wederbrand.
Varumärken: HDL, Hackadittliv, Conversify, Life Is Awesome, Timeless Brick, Hisingen Padel, Frölunda Kampsportcenter.
Mål 2026: bli skuldfri och höja kassaflödet via AI, appar, hemsidor, verktyg, föreläsningar och evenemang.

Du skriver nu en söndagskväll-sammanfattning som kommer skickas direkt via email.
Tonen är rak, kort, personlig, utan floskler. Använd hans namn.
Fokusera på mönster, flaskhalsar och ärlighet. Returnera ONLY valid compact JSON utan markdown.`,
      }],
      messages: [{
        role: "user",
        content: `Christian har ${activeIdeas.length} aktiva idéer. Gör söndagens genomgång.

${ideaList}

Returnera exakt detta JSON:
{
  "weekInsight": "2-3 meningar om mönster och fokus den här veckan",
  "fastestRevenue": "Snabbaste vägen till intäkt — en mening",
  "top3": [{ "index": 0, "reason": "Varför denna först" }],
  "warning": "Ärlig varning om mönster som oroar dig"
}
top3.index är 0-baserat. Max 3.`,
      }],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    console.error("Claude-fel:", claudeRes.status, err);
    return { statusCode: 500, body: "Claude failed" };
  }

  const claudeData = await claudeRes.json();
  const raw = claudeData.content?.[0]?.text || "";
  let parsed;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    parsed = { weekInsight: raw, top3: [], warning: "", fastestRevenue: "" };
  }

  // 3. Bygg HTML-mail
  const top3Ideas = (parsed.top3 || [])
    .map(t => activeIdeas[t.index])
    .filter(Boolean);

  const overdue = allIdeas.filter(i =>
    i.deadline && new Date(i.deadline) < new Date() && i.status !== "done"
  );

  const html = `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8" /><title>Söndagsgenomgång</title></head>
<body style="font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #02020e; color: #e0e0e0; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <h1 style="font-size: 22px; margin: 0 0 8px; background: linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">📅 Söndagsgenomgång</h1>
    <p style="margin: 0 0 24px; font-size: 13px; color: #888; letter-spacing: 1px; text-transform: uppercase;">${activeIdeas.length} aktiva idéer${overdue.length ? ` · ${overdue.length} försenade` : ""}</p>

    <div style="background: #00F0FF0d; border: 1px solid #00F0FF33; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;">
      <p style="margin: 0 0 6px; font-size: 11px; color: #00F0FF; letter-spacing: 1px; text-transform: uppercase; font-weight: 700;">🔍 Veckans analys</p>
      <p style="margin: 0; font-size: 14px; color: #ccc; line-height: 1.65;">${parsed.weekInsight || ""}</p>
    </div>

    ${parsed.fastestRevenue ? `
    <div style="background: #00ff8808; border: 1px solid #00ff8833; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;">
      <p style="margin: 0 0 6px; font-size: 11px; color: #00ff88; letter-spacing: 1px; text-transform: uppercase; font-weight: 700;">💰 Snabbaste vägen till intäkt</p>
      <p style="margin: 0; font-size: 14px; color: #ccc; line-height: 1.65;">${parsed.fastestRevenue}</p>
    </div>` : ""}

    ${parsed.warning ? `
    <div style="background: #ffaa0008; border: 1px solid #ffaa0033; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;">
      <p style="margin: 0 0 6px; font-size: 11px; color: #ffaa00; letter-spacing: 1px; text-transform: uppercase; font-weight: 700;">⚠️ Coach-varning</p>
      <p style="margin: 0; font-size: 14px; color: #ccc; line-height: 1.65;">${parsed.warning}</p>
    </div>` : ""}

    ${top3Ideas.length > 0 ? `
    <p style="font-size: 11px; color: #888; letter-spacing: 1px; text-transform: uppercase; margin: 24px 0 12px;">🎯 Agera på dessa den här veckan</p>
    ${top3Ideas.map((idea, i) => {
      const reason = parsed.top3[i]?.reason || "";
      return `
        <div style="background: #0c0c1e; border: 1px solid #1e1e3a; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px;">
          <p style="margin: 0 0 4px; font-size: 10px; color: #00F0FF; letter-spacing: 1px; text-transform: uppercase; font-weight: 700;">${idea.brand}</p>
          <p style="margin: 0 0 6px; font-size: 14px; color: #ddd; line-height: 1.5;">${idea.aiAnalysis?.summary || idea.transcript?.slice(0, 100) || ""}</p>
          ${reason ? `<p style="margin: 0; font-size: 12px; color: #888; font-style: italic;">${reason}</p>` : ""}
        </div>`;
    }).join("")}
    ` : ""}

    <div style="margin-top: 32px; text-align: center;">
      <a href="https://ideadump.se" style="display: inline-block; background: linear-gradient(135deg, #00F0FF28 0%, #F2B8B428 100%); border: 1px solid #00F0FF44; border-radius: 12px; padding: 12px 24px; color: #00F0FF; text-decoration: none; font-size: 14px; font-weight: 700;">Öppna IdeaDump →</a>
    </div>

    <p style="margin: 32px 0 0; font-size: 10px; color: #444; text-align: center; letter-spacing: 1px;">
      Skickas automatiskt varje söndag från IdeaDump · HDL
    </p>
  </div>
</body>
</html>`;

  // 4. Skicka via Resend
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "IdeaDump <hej@ideadump.se>",
      to: [OWNER_EMAIL],
      subject: `📅 Söndagsgenomgång — ${activeIdeas.length} aktiva idéer`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    console.error("Resend-fel:", resendRes.status, err);
    return { statusCode: 500, body: "Email failed" };
  }

  return { statusCode: 200, body: JSON.stringify({ sent: true, ideas: activeIdeas.length }) };
};
