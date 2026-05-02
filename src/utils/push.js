// Push notification helpers — prenumerera, avregistrera, kolla status
import { authedFetch } from "./authedFetch.js";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getPushStatus() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return "no-sw";
  const sub = await reg.pushManager.getSubscription();
  return sub ? "subscribed" : "idle";
}

export async function subscribePush(userId) {
  if (!pushSupported()) throw new Error("Push stöds ej i denna webbläsare.");
  if (!VAPID_PUBLIC) throw new Error("VITE_VAPID_PUBLIC_KEY saknas i build.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notistillstånd nekades.");

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }

  const res = await authedFetch("/.netlify/functions/push-subscribe", {
    method: "POST",
    body: JSON.stringify({
      userId,
      subscription: sub.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return sub;
}

export async function unsubscribePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
}

export async function sendTestPush(userId) {
  const res = await authedFetch("/.netlify/functions/push-send", {
    method: "POST",
    body: JSON.stringify({
      userId,
      title: "🎉 Push fungerar!",
      body: "IdeaDump kan nu skicka notiser till dig.",
      url: "https://ideadump.se",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
