// Verifierar Supabase JWT från Authorization-header.
// Användning:
//   const auth = await requireUser(event);
//   if (auth.error) return auth.error;
//   const userId = auth.userId;
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://wmvxantcujnsathpeqyu.supabase.co";

function unauthorized(message) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: message }),
  };
}

// Returnerar { userId } vid framgång, annars { error: { statusCode, body } }.
// Om expectedUserId anges måste den matcha tokenens user.id (förhindrar att en
// inloggad användare opererar på någon annans data).
async function requireUser(event, expectedUserId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return {
      error: {
        statusCode: 503,
        body: JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY saknas." }),
      },
    };
  }

  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { error: unauthorized("Saknar inloggning. Logga in och försök igen.") };
  }
  const token = match[1].trim();

  const supabase = createClient(SUPABASE_URL, serviceKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return { error: unauthorized("Sessionen har gått ut. Logga in igen.") };
  }

  if (expectedUserId && expectedUserId !== data.user.id) {
    return { error: unauthorized("userId matchar inte inloggad användare.") };
  }

  return { userId: data.user.id, supabase };
}

module.exports = { requireUser, SUPABASE_URL };
