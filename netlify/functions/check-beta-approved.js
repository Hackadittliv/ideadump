// Returnerar { approved: bool } för inloggad user. Använder JWT-email server-side
// så att frontend inte kan enumerera betalistan via direkt Supabase-query.
const { createClient } = require("@supabase/supabase-js");
const { requireUser, SUPABASE_URL } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const auth = await requireUser(event);
  if (auth.error) return auth.error;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(SUPABASE_URL, serviceKey);

  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(auth.userId);
  if (userErr || !userData?.user?.email) {
    return { statusCode: 200, body: JSON.stringify({ approved: false }) };
  }
  const email = userData.user.email.toLowerCase();

  const { data } = await supabase
    .from("ideadump_beta_signups")
    .select("approved")
    .eq("email", email)
    .maybeSingle();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved: data?.approved === true }),
  };
};
