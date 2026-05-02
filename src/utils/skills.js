// Klient för agent-skills (playbooks som Claude tillämpar vid analys).
import { authedFetch } from "./authedFetch.js";

export const SKILL_TRIGGERS = [
  { key: "always",  label: "Alltid",      hint: "Tillämpas vid varje analys" },
  { key: "keyword", label: "Nyckelord",   hint: "När transcript innehåller texten" },
  { key: "brand",   label: "Varumärke",   hint: "Bara för en specifik brand" },
];

export async function listSkills() {
  const res = await authedFetch("/.netlify/functions/skills-list", { method: "POST" });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  const data = await res.json();
  return data.skills || [];
}

export async function upsertSkill(input) {
  const res = await authedFetch("/.netlify/functions/skills-upsert", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  const data = await res.json();
  return data.skill;
}

export async function deleteSkill(id) {
  const res = await authedFetch("/.netlify/functions/skills-delete", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
  return true;
}
