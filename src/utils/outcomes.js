// Klient för outcomes-API:t — ground truth för rubrics.
import { authedFetch } from "./authedFetch.js";

export const OUTCOMES = [
  { key: "shipped",       label: "Genomförd",   icon: "🚀", color: "#00ff88" },
  { key: "sold",          label: "Tjänade pengar", icon: "💰", color: "#ffd166" },
  { key: "still_working", label: "Pågår",       icon: "🔨", color: "#00F0FF" },
  { key: "stalled",       label: "Fastnat",     icon: "🐢", color: "#ffaa00" },
  { key: "killed",        label: "Avslutad",    icon: "💀", color: "#888" },
];

export const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map(o => [o.key, o.label]));

export async function listOutcomes() {
  const res = await authedFetch("/.netlify/functions/outcomes-list", { method: "POST" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  const data = await res.json();
  return data.outcomes || [];
}

export async function upsertOutcome({ idea_id, outcome, notes }) {
  const res = await authedFetch("/.netlify/functions/outcomes-upsert", {
    method: "POST",
    body: JSON.stringify({ idea_id, outcome, notes }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  const data = await res.json();
  return data.outcome;
}
