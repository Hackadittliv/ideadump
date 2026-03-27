// Returnerar antal på väntelistan (för urgency-badge på landningssidan)
const { createClient } = require("@supabase/supabase-js");

exports.handler = async () => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || "https://wmvxantcujnsathpeqyu.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { count } = await supabase
      .from("ideadump_beta_signups")
      .select("*", { count: "exact", head: true });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
      body: JSON.stringify({ count: count ?? 0 }),
    };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ count: 0 }) };
  }
};
