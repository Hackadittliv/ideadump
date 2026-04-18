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

    let settled = false;
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("google-oauth") : null;

    const cleanup = () => {
      settled = true;
      clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      channel?.close();
      popup?.close();
    };

    const processPayload = async (payload) => {
      if (settled) return;
      const { code, state: returnedState, error } = payload;
      if (error) { cleanup(); reject(new Error(error)); return; }
      if (returnedState !== state) { cleanup(); reject(new Error("State mismatch")); return; }
      cleanup();
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

    // 1. BroadcastChannel — robust, fungerar även om COOP kapar window.opener
    if (channel) {
      channel.onmessage = (e) => {
        if (e.data?.type === "google-oauth-code") processPayload(e.data);
      };
    }

    // 2. localStorage-event — fallback om BroadcastChannel inte stöds
    const handleStorage = (e) => {
      if (e.key !== "google_oauth_result" || !e.newValue) return;
      try {
        const payload = JSON.parse(e.newValue);
        if (payload?.type === "google-oauth-code") {
          localStorage.removeItem("google_oauth_result");
          processPayload(payload);
        }
      } catch {}
    };
    window.addEventListener("storage", handleStorage);

    // 3. postMessage — sista fallback (funkar när opener inte är severed)
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "google-oauth-code") return;
      processPayload(event.data);
    };
    window.addEventListener("message", handleMessage);

    // Timeout — om användaren aldrig slutför auth på 5 min.
    // Vi kan inte polla popup.closed eftersom COOP blockerar den läsningen
    // på cross-origin popups (Chrome returnerar true spuriöst).
    const timeout = setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error("Auth tog för lång tid — försök igen."));
    }, 5 * 60 * 1000);
  });
}

// Läs/skriv går via Netlify Function eftersom RLS blockerar frontend.
export async function isGoogleCalendarConnected(userId) {
  try {
    const res = await fetch("/.netlify/functions/google-calendar-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.connected;
  } catch {
    return false;
  }
}

export async function disconnectGoogleCalendar(userId) {
  const res = await fetch("/.netlify/functions/google-calendar-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, action: "disconnect" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return true;
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
