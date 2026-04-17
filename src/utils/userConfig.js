// Användarkonfig — redigerbar från Settings-vyn, sparas i localStorage.
// Faller tillbaka till defaults om inget är satt.

const KEY = "ideadump_user_config";

export const DEFAULT_BRANDS = [
  { name: "HDL", color: "#00F0FF" },
  { name: "Hackadittliv", color: "#a8e6cf" },
  { name: "Conversify", color: "#13c8ec" },
  { name: "Life Is Awesome", color: "#F2B8B4" },
  { name: "Timeless Brick", color: "#e8a87c" },
  { name: "Hisingen Padel", color: "#7ec8e3" },
  { name: "Frölunda Kampsportcenter", color: "#c9a0dc" },
  { name: "Övrigt", color: "#666" },
];

export const DEFAULT_GOALS = `CHRISTIANS MÅL 2026:
1. Bli skuldfri — varje intäktsbeslut ska värderas mot hur det bidrar till att betala av skulder
2. Höja kassaflödet med nya intäkter inom: AI-tjänster, appar, hemsidor, verktyg, föreläsningar och evenemang`;

export function loadUserConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { brands: DEFAULT_BRANDS, goals: DEFAULT_GOALS };
    const parsed = JSON.parse(raw);
    return {
      brands: Array.isArray(parsed.brands) && parsed.brands.length > 0
        ? parsed.brands
        : DEFAULT_BRANDS,
      goals: typeof parsed.goals === "string" && parsed.goals.trim()
        ? parsed.goals
        : DEFAULT_GOALS,
    };
  } catch {
    return { brands: DEFAULT_BRANDS, goals: DEFAULT_GOALS };
  }
}

export function saveUserConfig(config) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {}
}

export function getBrandNames() {
  return loadUserConfig().brands.map(b => b.name);
}

export function getBrandColors() {
  const map = {};
  for (const b of loadUserConfig().brands) map[b.name] = b.color;
  return map;
}
