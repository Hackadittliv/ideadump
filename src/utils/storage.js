const KEYS = {
  ideas: "ideadump_ideas",
  anthropic: "ideadump_anthropic",
  openai: "ideadump_openai",
};

export function loadIdeas() {
  try {
    const raw = localStorage.getItem(KEYS.ideas);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveIdeas(ideas) {
  try {
    localStorage.setItem(KEYS.ideas, JSON.stringify(ideas));
  } catch {}
}

export function loadApiKeys() {
  return {
    anthropic: localStorage.getItem(KEYS.anthropic) || "",
    openai: localStorage.getItem(KEYS.openai) || "",
  };
}

export function saveApiKey(name, value) {
  try {
    localStorage.setItem(KEYS[name], value);
  } catch {}
}
