// Temakonstanter för IdeaDump
import {
  getBrandNames,
  getBrandColors as getBrandColorsFromConfig,
  DEFAULT_BRANDS,
} from "../utils/userConfig.js";

export const COLORS = {
  bg: "#02020e",
  surface: "#0a0a1a",
  surfaceAlt: "#111128",
  border: "#1a1a3a",
  accent: "#00F0FF",
  accentDim: "#00F0FF22",
  text: "#e0e0e0",
  textMuted: "#888",
  textDim: "#555",
  success: "#00ff88",
  error: "#ff6666",
  warning: "#ffaa00",
};

// Statiska defaults — används som fallback och för SSR/build
export const DEFAULT_BRAND_NAMES = DEFAULT_BRANDS.map(b => b.name);
export const DEFAULT_BRAND_COLOR_MAP = DEFAULT_BRANDS.reduce((acc, b) => {
  acc[b.name] = b.color;
  return acc;
}, {});

// Dynamiska — läses från localStorage vid varje anrop så UI speglar ändringar från Settings
export function getBrands() {
  return getBrandNames();
}

export function getBrandColorsMap() {
  return getBrandColorsFromConfig();
}

// Bakåtkompatibla exports — utgår från användarens aktuella config
// Obs: dessa är ögonblicksbilder vid modul-init; komponenter bör använda
// getBrands() / getBrandColorsMap() för att få senaste värdet efter redigering.
export const BRANDS = getBrandNames();
export const BRAND_COLORS = getBrandColorsFromConfig();

export const STATUSES = [
  { key: "inbox",    label: "Inbox",       icon: "📥" },
  { key: "next",     label: "Next Action", icon: "🎯" },
  { key: "incubate", label: "Inkubera",    icon: "💤" },
  { key: "park",     label: "Parkera",     icon: "📦" },
  { key: "done",     label: "Klar",        icon: "✅" },
];
