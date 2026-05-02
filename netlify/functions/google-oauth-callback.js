// Tar emot Googles OAuth-callback, byter auth code mot tokens, sparar per-user.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !serviceKey) {
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Google OAuth ej konfigurerat — sätt GOOGLE_CLIENT_ID/SECRET i Netlify env." }),
    };
  }

  let code, redirectUri, bodyUserId;
  try {
    ({ code, redirectUri, userId: bodyUserId } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Ogiltig request body." }) };
  }

  if (!code || !redirectUri) {
    return { statusCode: 400, body: JSON.stringify({ error: "code och redirectUri krävs." }) };
  }

  const auth = await requireUser(event, bodyUserId);
  if (auth.error) return auth.error;
  const userId = auth.userId;

  // Byt auth code mot access + refresh token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return { statusCode: tokenRes.status, body: JSON.stringify({ error: "Token-byte misslyckades: " + err }) };
  }

  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Google skickade inget refresh_token. Besök https://myaccount.google.com/permissions → Ta bort IdeaDump → försök igen med prompt=consent.",
      }),
    };
  }

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const { error } = await supabase
    .from("ideadump_google_tokens")
    .upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      scope: tokens.scope || "",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
