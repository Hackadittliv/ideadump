// Reflections-vy: lärdomar som Claude använder som kontext vid analys.
// Användaren kan skriva in manuellt, godkänna pending från söndagsanalysen,
// pinna viktiga, eller arkivera obsoleta.
import { useEffect, useState } from "react";
import {
  listReflections, upsertReflection, deleteReflection,
  REFLECTION_TYPES, REFLECTION_STATUSES,
} from "../../utils/reflections.js";

const STATUS_COLOR = Object.fromEntries(REFLECTION_STATUSES.map(s => [s.key, s.color]));

export default function ReflectionsView({ flash }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // { id?, type, statement, status }

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await listReflections());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const startNew = () => setEditing({ type: "preference", statement: "", status: "active" });
  const startEdit = (r) => setEditing({ id: r.id, type: r.type, statement: r.statement, status: r.status });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing.statement.trim()) { flash?.("Skriv något i texten."); return; }
    try {
      await upsertReflection(editing);
      flash?.("Sparad ✨");
      setEditing(null);
      await reload();
    } catch (e) {
      flash?.("Fel: " + e.message);
    }
  };

  const setStatus = async (r, status) => {
    try {
      await upsertReflection({ id: r.id, type: r.type, statement: r.statement, status });
      await reload();
    } catch (e) {
      flash?.("Fel: " + e.message);
    }
  };

  const remove = async (r) => {
    if (!confirm("Radera denna lärdom?")) return;
    try {
      await deleteReflection(r.id);
      await reload();
    } catch (e) {
      flash?.("Fel: " + e.message);
    }
  };

  return (
    <div style={{ padding: "24px 20px" }} className="appear">
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#00F0FF", margin: "0 0 4px" }}>
          🧠 Lärdomar
        </h2>
        <p style={{ margin: 0, fontSize: 11, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
          Kontext som Claude använder när idéer analyseras
        </p>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "#888", lineHeight: 1.6 }}>
          Skriv in mönster och preferenser du upptäcker om dig själv. Söndagsanalysen kan också föreslå nya — du godkänner dem här.
        </p>
      </div>

      {!editing && (
        <button onClick={startNew} style={{
          width: "100%", padding: "12px", marginBottom: 16,
          background: "linear-gradient(135deg, #00F0FF18 0%, #F2B8B418 100%)",
          border: "1px solid #00F0FF33", borderRadius: 12,
          color: "#00F0FF", fontSize: 13, fontWeight: 700, cursor: "pointer",
          minHeight: 44,
        }}>
          + Ny lärdom
        </button>
      )}

      {editing && (
        <div style={{
          background: "#0c0c1e", border: "1px solid #00F0FF33",
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#00F0FF", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>
            {editing.id ? "Redigera lärdom" : "Ny lärdom"}
          </p>

          <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Typ</label>
          <select
            value={editing.type}
            onChange={e => setEditing({ ...editing, type: e.target.value })}
            style={{
              width: "100%", padding: "10px 12px", marginBottom: 12,
              background: "#02020e", border: "1px solid #1e1e3a", borderRadius: 8,
              color: "#ccc", fontSize: 14, outline: "none",
            }}
          >
            {REFLECTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>

          <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Lärdom</label>
          <textarea
            value={editing.statement}
            onChange={e => setEditing({ ...editing, statement: e.target.value })}
            placeholder="T.ex. 'Jag övervärderar idéer som handlar om kurser. Om jag inte gjort något inom 7 dagar är det en distraction.'"
            inputMode="text"
            style={{
              width: "100%", minHeight: 90, padding: "10px 12px", marginBottom: 12,
              background: "#02020e", border: "1px solid #1e1e3a", borderRadius: 8,
              color: "#ccc", fontSize: 16, fontFamily: "inherit", outline: "none",
              lineHeight: 1.6, resize: "vertical", boxSizing: "border-box",
            }}
          />

          {editing.id && (
            <>
              <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>Status</label>
              <select
                value={editing.status}
                onChange={e => setEditing({ ...editing, status: e.target.value })}
                style={{
                  width: "100%", padding: "10px 12px", marginBottom: 12,
                  background: "#02020e", border: "1px solid #1e1e3a", borderRadius: 8,
                  color: "#ccc", fontSize: 14, outline: "none",
                }}
              >
                {REFLECTION_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </>
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
              <span style={{
                fontSize: 10, color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              }}>
                {typeLabel} · {statusLabel}
                {r.source !== "manual" && ` · 🤖 ${r.source}`}
              </span>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#ddd", lineHeight: 1.6 }}>
              {r.statement}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {r.status === "pending" && (
                <button onClick={() => setStatus(r, "active")} style={btnSmall("#00F0FF")}>
                  ✓ Godkänn
                </button>
              )}
              {r.status !== "pinned" && r.status !== "pending" && (
                <button onClick={() => setStatus(r, "pinned")} style={btnSmall("#F2B8B4")}>
                  📌 Pinna
                </button>
              )}
              {r.status === "pinned" && (
                <button onClick={() => setStatus(r, "active")} style={btnSmall("#888")}>
                  Avpinna
                </button>
              )}
              <button onClick={() => startEdit(r)} style={btnSmall("#888")}>
                ✎ Redigera
              </button>
              {r.status !== "archived" && r.status !== "pending" && (
                <button onClick={() => setStatus(r, "archived")} style={btnSmall("#666")}>
                  Arkivera
                </button>
              )}
              <button onClick={() => remove(r)} style={btnSmall("#ff6644")}>
                🗑
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function btnSmall(color) {
  return {
    background: "transparent", border: `1px solid ${color}33`,
    borderRadius: 8, padding: "8px 12px", minHeight: 36,
    color, fontSize: 11, cursor: "pointer",
  };
}
