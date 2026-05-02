// Revenue Action Loop — varje idé får en konkret marknadshandling som
// måste utföras eller övergivas. Tvingar idéerna ut ur huvudet och in i
// kassaflöde. Ingen separat tabell i v1: vi lagrar status + utfall direkt
// på idé-objektet (revenueActionStatus, revenueOutcome) som synkas via
// cloudSync precis som resten av idé-datan.

export const REVENUE_ACTIONS = [
  { key: "sales_call",   label: "Säljsamtal",     icon: "📞", color: "#00ff88" },
  { key: "landing_page", label: "Landningssida",  icon: "🌐", color: "#13c8ec" },
  { key: "outreach",     label: "Outreach/DM",    icon: "✉️", color: "#F2B8B4" },
  { key: "price_test",   label: "Pris-test",      icon: "💰", color: "#ffd166" },
  { key: "customer_ask", label: "Kund-fråga",     icon: "🤝", color: "#a8e6cf" },
  { key: "partner_ping", label: "Partner-ping",   icon: "🔗", color: "#c9a0dc" },
  { key: "no_action",    label: "Ej revenue",     icon: "—",  color: "#666" },
];

export const REVENUE_ACTION_LABEL = Object.fromEntries(REVENUE_ACTIONS.map(a => [a.key, a.label]));
export const REVENUE_ACTION_ICON = Object.fromEntries(REVENUE_ACTIONS.map(a => [a.key, a.icon]));
export const REVENUE_ACTION_COLOR = Object.fromEntries(REVENUE_ACTIONS.map(a => [a.key, a.color]));

export const REVENUE_STATUSES = {
  PLANNED: "planned",
  DONE: "done",
  ABANDONED: "abandoned",
};

// Hjälper IdeaCard avgöra om revenueAction-blocket ska visas alls
export function hasActionableRevenue(idea) {
  const ra = idea?.aiAnalysis?.revenueAction;
  return ra && ra.type && ra.type !== "no_action" && ra.description;
}

// Mark idea as done with optional revenue + note
export function markRevenueDone(idea, { revenueSek, note }) {
  return {
    ...idea,
    revenueActionStatus: REVENUE_STATUSES.DONE,
    revenueOutcome: {
      revenueSek: typeof revenueSek === "number" && !Number.isNaN(revenueSek) ? revenueSek : null,
      note: typeof note === "string" ? note.slice(0, 280) : "",
      completedAt: new Date().toISOString(),
    },
  };
}

export function markRevenueAbandoned(idea, reason) {
  return {
    ...idea,
    revenueActionStatus: REVENUE_STATUSES.ABANDONED,
    revenueOutcome: {
      revenueSek: null,
      note: typeof reason === "string" ? reason.slice(0, 280) : "",
      completedAt: new Date().toISOString(),
    },
  };
}

export function resetRevenueStatus(idea) {
  const next = { ...idea };
  delete next.revenueActionStatus;
  delete next.revenueOutcome;
  return next;
}
