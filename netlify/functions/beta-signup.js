// Beta-anmälan — sparar i Supabase + skickar bekräftelsemail via Resend
const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let name, email, reason;
  try {
    ({ name, email, reason } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  if (!email?.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: "E-post krävs." }) };
  }

  // ── Spara i Supabase ──
  const supabase = createClient(
    process.env.SUPABASE_URL || "https://wmvxantcujnsathpeqyu.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error: dbError } = await supabase
    .from("ideadump_beta_signups")
    .upsert({ email: email.trim().toLowerCase(), name: name || "", reason: reason || "" }, { onConflict: "email" });

  if (dbError) {
    return { statusCode: 500, body: JSON.stringify({ error: "Kunde inte spara. Försök igen." }) };
  }

  // ── Lägg till i Hackadittliv CRM ──
  const crmKey = process.env.HACKADITTLIV_API_KEY;
  if (crmKey) {
    await fetch("https://fcgjhzccucyyrpgggjwj.supabase.co/functions/v1/subscribe-lead", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": crmKey,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        first_name: name || "",
        source: "ideadump",
        tags: ["hdl_newsletter", "ideadump_beta"],
        track: "ideadump",
      }),
    }).catch(() => {});
  }

  // ── Skicka bekräftelsemail via Resend ──
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "IdeaDump <hej@ideadump.se>",
        to: [email.trim()],
        subject: "Du är med på IdeaDump beta-listan! 🎉",
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; background: #02020e; color: #e0e0e0; padding: 40px 32px; border-radius: 16px;">
            <h1 style="font-size: 24px; margin: 0 0 8px; background: linear-gradient(90deg, #00F0FF, #F2B8B4); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              Du är med på listan!
            </h1>
            <p style="color: #888; font-size: 15px; line-height: 1.7; margin: 16px 0;">
              ${name ? `Hej ${name}! ` : "Hej! "}Tack för att du anmält dig till IdeaDump beta.
            </p>
            <p style="color: #888; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">
              Vi jobbar på att ge dig tillgång så snart som möjligt. Du hör av dig från oss när din plats är redo — håll utkik i inkorgen.
            </p>
            <div style="background: #0c0c1e; border: 1px solid #1a1a2e; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #00F0FF; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">Vad du får tillgång till</p>
              <ul style="margin: 0; padding-left: 16px; color: #666; font-size: 14px; line-height: 2;">
                <li>Röstdrivet idéfångst med Siri-integration</li>
                <li>AI-analys med Claude — ICE-scoring och coaching</li>
                <li>Söndagsgenomgång med veckoprioritering</li>
                <li>Kalenderintegration för Next Actions</li>
              </ul>
            </div>
            <p style="color: #333; font-size: 12px; margin: 32px 0 0; text-align: center;">
              © 2026 Hackadittliv · Byggt av Conversify.io
            </p>
          </div>
        `,
      }),
    }).catch(() => {}); // om Resend misslyckas, fortsätt ändå
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
