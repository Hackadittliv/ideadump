// Klient för reflections-API:t.
import { authedFetch } from "./authedFetch.js";

export async function listReflections() {
  const res = await authedFetch("/.netlify/functions/reflections-list", { method: "POST" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  const data = await res.json();
  return data.reflections || [];
}

export async function upsertReflection(input) {
  // Skicka bara fält som klienten faktiskt får ändra; servern sätter user_id/source.
  const payload = {
    id: input.id,
    type: input.type,
    statement: input.statement,
    status: input.status,
    brand: input.brand || null,
    evidence_idea_ids: input.evidence_idea_ids,
  };
  const res = await authedFetch("/.netlify/functions/reflections-upsert", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  const data = await res.json();
  return data.reflection;
}

export async function suggestReflectionFromIdea(idea_id) {
  const res = await authedFetch("/.netlify/functions/reflections-suggest-from-idea", {
    method: "POST",
    body: JSON.stringify({ idea_id }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return res.json(); // { reflection } eller { skipped: true, reason }
}

export async function deleteReflection(id) {
  const res = await authedFetch("/.netlify/functions/reflections-delete", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return true;
}

export const REFLECTION_TYPES = [
  { key: "pattern", label: "Mönster" },
  { key: "preference", label: "Preferens" },
  { key: "constraint", label: "Begränsning" },
  { key: "anti_pattern", label: "Anti-mönster" },
  { key: "goal_shift", label: "Mål-skift" },
];

export const REFLECTION_STATUSES = [
  { key: "active", label: "Aktiv", color: "#00F0FF" },
  { key: "pinned", label: "Prioriterad", color: "#F2B8B4" },
  { key: "pending", label: "Väntar godkännande", color: "#ffaa00" },
  { key: "archived", label: "Arkiverad", color: "#666" },
];
