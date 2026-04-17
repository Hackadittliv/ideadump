// Google Calendar OAuth + event-skapande via Netlify Functions.
// Använder auth code flow i popup. Klientnyckel (VITE_GOOGLE_CLIENT_ID) är publik.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function googleOAuthConfigured() {
  return !!CLIENT_ID;
}

function getRedirectUri() {
  return `${window.location.origin}/google-callback.html`;
}

export function openGoogleOAuthPopup(userId) {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error("VITE_GOOGLE_CLIENT_ID saknas i build."));
      return;
    }

    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem("google_oauth_state", state);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: getRedirectUri(),
      response_type: "code",
      scope: SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
    });

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "google-oauth",
      "width=500,height=650",
    );

    const handler = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "google-oauth-code") return;

      const { code, state: returnedState, error } = event.data;
      window.removeEventListener("message", handler);
      popup?.close();

      if (error) { reject(new Error(error)); return; }
      if (returnedState !== state) { reject(new Error("State mismatch")); return; }

      try {
        const res = await fetch("/.netlify/functions/google-oauth-callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirectUri: getRedirectUri(), userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        resolve(true);
      } catch (e) {
        reject(e);
      }
    };

    window.addEventListener("message", handler);

    // Fallback: om popupen stängs innan callback
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer);
        window.removeEventListener("message", handler);
        reject(new Error("Popup stängdes innan auth klar."));
      }
    }, 500);
  });
}

export async function createCalendarEvent(userId, idea, scheduledDate) {
  const res = await fetch("/.netlify/functions/google-calendar-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, idea, scheduledDate }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
