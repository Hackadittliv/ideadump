// Wrapper kring fetch som lägger på Authorization: Bearer <jwt> från Supabase-sessionen.
// Använd för alla anrop till Netlify Functions som hanterar användar-bunden data.
import { supabase } from "../supabase.js";

export async function authedFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Du måste vara inloggad. Logga in och försök igen.");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${session.access_token}`,
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, { ...options, headers });
}
