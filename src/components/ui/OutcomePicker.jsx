// 1-tap outcome-capture på en idé. Render:as i IdeaCard:s expanderade vy.
// Idén visar nuvarande outcome om den finns, annars 5 knappar.
import { useState, useEffect } from "react";
import { OUTCOMES, listOutcomes, upsertOutcome } from "../../utils/outcomes.js";

// Globalt cache så listan inte hämtas om vid varje IdeaCard-expand
let cachedOutcomes = null;
let cacheLoadedAt = 0;
const CACHE_MS = 30_000;

async function loadCached(force = false) {
  if (!force && cachedOutcomes && Date.now() - cacheLoadedAt < CACHE_MS) return cachedOutcomes;
  cachedOutcomes = await listOutcomes();
  cacheLoadedAt = Date.now();
  return cachedOutcomes;
}

export function invalidateOutcomesCache() {
  cachedOutcomes = null;
  cacheLoadedAt = 0;
}

export default function OutcomePicker({ idea, onSaved }) {
  const [current, setCurrent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadCached()
      .then((list) => {
        if (cancelled) return;
        const found = list.find((o) => o.idea_id === idea.id);
        setCurrent(found || null);
        if (found) setNotes(found.notes || "");
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [idea.id]);

  const save = async (key) => {
    setSaving(true);
    setError("");
    try {
      const saved = await upsertOutcome({ idea_id: idea.id, outcome: key, notes });
      invalidateOutcomesCache();
      setCurrent(saved);
      setEditing(false);
      onSaved?.(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (current && !editing) {
    const o = OUTCOMES.find((x) => x.key === current.outcome);
    return (
      <div style={{
        background: "#0a0a18", border: `1px solid ${o?.color || "#333"}33`,
        borderRadius: 10, padding: "10px 14px", marginBottom: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: o?.color || "#ccc" }}>
            {o?.icon} <strong>Utfall:</strong> {o?.label || current.outcome}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            style={{
              background: "transparent", border: "1px solid #1e1e3a",
              borderRadius: 8, padding: "4px 10px", color: "#666",
              fontSize: 11, cursor: "pointer",
            }}
          >Ändra</button>
        </div>
        {current.notes && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#888", lineHeight: 1.5 }}>
            {current.notes}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: "#0a0a18", border: "1px solid #1e1e3a",
      borderRadius: 10, padding: "10px 14px", marginBottom: 10,
    }}>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>
        🎯 Vad hände med denna?
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {OUTCOMES.map((o) => (
          <button
            key={o.key}
            onClick={(e) => { e.stopPropagation(); save(o.key); }}
            disabled={saving}
            style={{
              background: `${o.color}10`, border: `1px solid ${o.color}44`,
              borderRadius: 8, padding: "8px 10px", color: o.color,
              fontSize: 12, cursor: saving ? "wait" : "pointer", minHeight: 36,
            }}
          >
            {o.icon} {o.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder="Valfri kommentar (en mening)"
        style={{
          width: "100%", padding: "8px 10px",
          background: "#02020e", border: "1px solid #1e1e3a", borderRadius: 8,
          color: "#ccc", fontSize: 13, outline: "none", boxSizing: "border-box",
        }}
      />
      {error && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#ff6644" }}>Fel: {error}</p>}
      {editing && current && (
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(false); }}
          style={{
            marginTop: 6, background: "transparent", border: "none",
            color: "#666", fontSize: 11, cursor: "pointer",
          }}
        >Avbryt</button>
      )}
    </div>
  );
}
