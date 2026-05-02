// Lärdomar (Memories) — fakta/preferenser/mönster om användaren.
// Claude använder dem som kontext när idéer analyseras.
import { useEffect, useState } from "react";
import {
  listReflections, upsertReflection, deleteReflection,
  REFLECTION_TYPES, REFLECTION_STATUSES,
} from "../../utils/reflections.js";
import { getBrandNames } from "../../utils/userConfig.js";
import { loadIdeas } from "../../utils/storage.js";

const STATUS_COLOR = Object.fromEntries(REFLECTION_STATUSES.map(s => [s.key, s.color]));

function EvidenceList({ ids }) {
  if (!ids || ids.length === 0) return null;
  const ideas = loadIdeas();
  const byId = Object.fromEntries(ideas.map(i => [i.id, i]));
  return (
    <div style={{ marginTop: 6, marginBottom: 10, paddingLeft: 8, borderLeft: "2px solid #1a1a30" }}>
      <p style={{ margin: "0 0 4px", fontSize: 10, color: "#666", letterSpacing: 1, textTransform: "uppercase" }}>
        Bygger på {ids.length} idé{ids.length === 1 ? "" : "er"}
      </p>
      {ids.slice(0, 5).map(id => {
        const i = byId[id];
        const text = i ? (i.aiAnalysis?.summary || i.transcript || "").slice(0, 80) : `(borttagen idé · ${id.slice(0, 8)})`;
        return (
          <p key={id} style={{ margin: "2px 0", fontSize: 11, color: "#888", lineHeight: 1.5 }}>· {text}</p>
        );
      })}
    </div>
  );
}

export default function MemoriesPanel({ flash, onPendingCountChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  const reload = async () => {
    setLoading(true); setError("");
    try { setItems(await listReflections()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    onPendingCountChange?.(items.filter(r => r.status === "pending").length);
  }, [items, onPendingCountChange]);

  const startNew = () => setEditing({ type: "preference", statement: "", status: "active", brand: "" });
  const startEdit = (r) => setEditing({ id: r.id, type: r.type, statement: r.statement, status: r.status, brand: r.brand || "" });
  const cancel = () => setEditing(null);
  const brandOptions = getBrandNames();

  const save = async () => {
    if (!editing.statement.trim()) { flash?.("Skriv något i texten."); return; }
    try { await upsertReflection(editing); flash?.("Sparad ✨"); setEditing(null); await reload(); }
    catch (e) { flash?.("Fel: " + e.message); }
  };

  const setStatus = async (r, status) => {
    try { await upsertReflection({ id: r.id, type: r.type, statement: r.statement, status, brand: r.brand || null }); await reload(); }
    catch (e) { flash?.("Fel: " + e.message); }
  };

  const remove = async (r) => {
    if (!confirm("Radera denna lärdom?")) return;
    try { await deleteReflection(r.id); await reload(); }
    catch (e) { flash?.("Fel: " + e.message); }
  };

  return (
    <div>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888", lineHeight: 1.6 }}>
        Skriv in mönster och preferenser du upptäcker om dig själv. Söndagsanalysen kan också föreslå nya — du godkänner dem här.
      </p>

      {!editing && (
        <button onClick={startNew} style={{
          width: "100%", padding: "12px", marginBottom: 16,
          background: "linear-gradient(135deg, #00F0FF18 0%, #F2B8B418 100%)",
          border: "1px solid #00F0FF33", borderRadius: 12,
          color: "#00F0FF", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44,
        }}>+ Ny lärdom</button>
      )}

      {editing && (
        <div style={{
          background: "#0c0c1e", border: "1px solid #00F0FF33",
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#00F0FF", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>
            {editing.id ? "Redigera lärdom" : "Ny lärdom"}
          </p>

          <Field label="Typ">
            <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} style={inputStyle}>
              {REFLECTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </Field>

          <Field label="Lärdom">
            <textarea
              value={editing.statement}
              onChange={e => setEditing({ ...editing, statement: e.target.value })}
              placeholder="T.ex. 'Jag övervärderar idéer som handlar om kurser. Om jag inte gjort något inom 7 dagar är det en distraction.'"
              style={{ ...inputStyle, minHeight: 90, fontFamily: "inherit", lineHeight: 1.6, resize: "vertical", fontSize: 16 }}
            />
          </Field>

          <Field label="Varumärke (valfritt)">
            <select value={editing.brand || ""} onChange={e => setEditing({ ...editing, brand: e.target.value })} style={inputStyle}>
              <option value="">Global (alla varumärken)</option>
              {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>

          {editing.id && (
            <Field label="Status">
              <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })} style={inputStyle}>
                {REFLECTION_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} style={{
              flex: 1, padding: "12px", minHeight: 44,
              background: "linear-gradient(135deg, #00F0FF28 0%, #00c8d440 100%)",
              border: "1px solid #00F0FF55", borderRadius: 10,
              color: "#00F0FF", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Spara</button>
            <button onClick={cancel} style={{
              padding: "12px 16px", minHeight: 44,
              background: "transparent", border: "1px solid #1e1e3a", borderRadius: 10,
              color: "#666", fontSize: 13, cursor: "pointer",
            }}>Avbryt</button>
          </div>
        </div>
      )}

      {loading && <p style={{ fontSize: 12, color: "#666" }}>Laddar...</p>}
      {error && <p style={{ fontSize: 12, color: "#ff6644" }}>Fel: {error}</p>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>
            Inga lärdomar än. Lägg till första — eller vänta på söndagsanalysen som kan föreslå.
          </p>
        </div>
      )}

      {items.map(r => {
        const typeLabel = REFLECTION_TYPES.find(t => t.key === r.type)?.label || r.type;
        const statusLabel = REFLECTION_STATUSES.find(s => s.key === r.status)?.label || r.status;
        const color = STATUS_COLOR[r.status] || "#888";
        return (
          <div key={r.id} style={{
            background: "#0a0a18", border: `1px solid ${color}33`,
            borderRadius: 10, padding: "12px 14px", marginBottom: 8,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                {typeLabel} · {statusLabel}
                {r.brand && ` · ${r.brand}`}
                {r.source !== "manual" && ` · 🤖 ${r.source}`}
              </span>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#ddd", lineHeight: 1.6 }}>{r.statement}</p>
            <EvidenceList ids={r.evidence_idea_ids} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {r.status === "pending" && (
                <button onClick={() => setStatus(r, "active")} style={btnSmall("#00F0FF")}>✓ Godkänn</button>
              )}
              {r.status !== "pinned" && r.status !== "pending" && (
                <button onClick={() => setStatus(r, "pinned")} style={btnSmall("#F2B8B4")}>📌 Pinna</button>
              )}
              {r.status === "pinned" && (
                <button onClick={() => setStatus(r, "active")} style={btnSmall("#888")}>Avpinna</button>
              )}
              <button onClick={() => startEdit(r)} style={btnSmall("#888")}>✎ Redigera</button>
              {r.status !== "archived" && r.status !== "pending" && (
                <button onClick={() => setStatus(r, "archived")} style={btnSmall("#666")}>Arkivera</button>
              )}
              <button onClick={() => remove(r)} style={btnSmall("#ff6644")}>🗑</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px",
  background: "#02020e", border: "1px solid #1e1e3a", borderRadius: 8,
  color: "#ccc", fontSize: 14, outline: "none", boxSizing: "border-box",
};

function btnSmall(color) {
  return {
    background: "transparent", border: `1px solid ${color}33`,
    borderRadius: 8, padding: "8px 12px", minHeight: 36,
    color, fontSize: 11, cursor: "pointer",
  };
}
