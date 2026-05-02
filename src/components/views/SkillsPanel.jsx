// Tekniker-panel (Skills): återanvändbara prompt-fragment som Claude
// tillämpar vid idé-analys. Triggrar: alltid, nyckelord, eller brand.
import { useEffect, useState } from "react";
import { listSkills, upsertSkill, deleteSkill, SKILL_TRIGGERS } from "../../utils/skills.js";
import { getBrandNames } from "../../utils/userConfig.js";

const TRIGGER_LABEL = Object.fromEntries(SKILL_TRIGGERS.map(t => [t.key, t.label]));

const EMPTY = {
  name: "",
  when_to_use: "",
  prompt_fragment: "",
  trigger_type: "always",
  trigger_value: "",
  brand: "",
  enabled: true,
};

export default function SkillsPanel({ flash }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const brandOptions = getBrandNames();

  const reload = async () => {
    setLoading(true);
    setError("");
    try { setItems(await listSkills()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const startNew = () => setEditing({ ...EMPTY });
  const startEdit = (s) => setEditing({
    id: s.id, name: s.name, when_to_use: s.when_to_use || "",
    prompt_fragment: s.prompt_fragment, trigger_type: s.trigger_type,
    trigger_value: s.trigger_value || "", brand: s.brand || "",
    enabled: s.enabled,
  });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing.name.trim() || !editing.prompt_fragment.trim()) {
      flash?.("Namn och prompt-fragment krävs.");
      return;
    }
    try {
      await upsertSkill({
        ...editing,
        brand: editing.brand || null,
        trigger_value: editing.trigger_type === "brand"
          ? (editing.trigger_value || editing.brand || "")
          : editing.trigger_value,
      });
      flash?.("Sparad ✨");
      setEditing(null);
      await reload();
    } catch (e) {
      flash?.("Fel: " + e.message);
    }
  };

  const toggleEnabled = async (s) => {
    try {
      await upsertSkill({
        id: s.id, name: s.name, when_to_use: s.when_to_use,
        prompt_fragment: s.prompt_fragment, trigger_type: s.trigger_type,
        trigger_value: s.trigger_value, brand: s.brand,
        enabled: !s.enabled,
      });
      await reload();
    } catch (e) { flash?.("Fel: " + e.message); }
  };

  const remove = async (s) => {
    if (!confirm(`Radera tekniken "${s.name}"?`)) return;
    try { await deleteSkill(s.id); await reload(); }
    catch (e) { flash?.("Fel: " + e.message); }
  };

  return (
    <div>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888", lineHeight: 1.6 }}>
        Tekniker är återanvändbara playbooks som Claude tillämpar vid analys. Använd när du upptäcker att du ger samma typ av instruktion flera gånger.
      </p>

      {!editing && (
        <button onClick={startNew} style={{
          width: "100%", padding: "12px", marginBottom: 16,
          background: "linear-gradient(135deg, #00F0FF18 0%, #F2B8B418 100%)",
          border: "1px solid #00F0FF33", borderRadius: 12,
          color: "#00F0FF", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44,
        }}>+ Ny teknik</button>
      )}

      {editing && (
        <div style={{
          background: "#0c0c1e", border: "1px solid #00F0FF33",
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#00F0FF", letterSpacing: 1, fontWeight: 700, textTransform: "uppercase" }}>
            {editing.id ? "Redigera teknik" : "Ny teknik"}
          </p>

          <Field label="Namn">
            <input
              value={editing.name}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              placeholder="T.ex. 'HDL kund-pass-check'"
              style={inputStyle}
            />
          </Field>

          <Field label="När den används (valfri kommentar)">
            <input
              value={editing.when_to_use}
              onChange={e => setEditing({ ...editing, when_to_use: e.target.value })}
              placeholder="T.ex. 'För HDL-idéer som handlar om kundvärde'"
              style={inputStyle}
            />
          </Field>

          <Field label="Trigger">
            <select
              value={editing.trigger_type}
              onChange={e => setEditing({ ...editing, trigger_type: e.target.value })}
              style={inputStyle}
            >
              {SKILL_TRIGGERS.map(t => (
                <option key={t.key} value={t.key}>{t.label} — {t.hint}</option>
              ))}
            </select>
          </Field>

          {editing.trigger_type === "keyword" && (
            <Field label="Nyckelord (text i transcript)">
              <input
                value={editing.trigger_value}
                onChange={e => setEditing({ ...editing, trigger_value: e.target.value })}
                placeholder="T.ex. 'kurs' eller 'workshop'"
                style={inputStyle}
              />
            </Field>
          )}

          {(editing.trigger_type === "brand" || editing.brand) && (
            <Field label="Varumärke">
              <select
                value={editing.brand || ""}
                onChange={e => setEditing({ ...editing, brand: e.target.value })}
                style={inputStyle}
              >
                <option value="">Välj varumärke...</option>
                {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          )}

          <Field label="Prompt-fragment (det Claude faktiskt får i system-prompten)">
            <textarea
              value={editing.prompt_fragment}
              onChange={e => setEditing({ ...editing, prompt_fragment: e.target.value })}
              placeholder="T.ex. 'När idén handlar om kurser: börja alltid med att lista vilka av Christians befintliga 5 betalande kunder den passar för. Om <2 av dem passar, flagga som distraction.'"
              style={{ ...inputStyle, minHeight: 110, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
          </Field>

          {editing.id && (
            <Field label="Aktiv">
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#ccc", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={e => setEditing({ ...editing, enabled: e.target.checked })}
                />
                Tillämpas vid analys
              </label>
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
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛠</div>
          <p style={{ color: "#666", fontSize: 13, lineHeight: 1.6 }}>
            Inga tekniker än. Lägg till en när du märker att du ger samma typ av instruktion flera gånger.
          </p>
        </div>
      )}

      {items.map(s => {
        const color = s.enabled ? "#00F0FF" : "#666";
        return (
          <div key={s.id} style={{
            background: "#0a0a18", border: `1px solid ${color}33`,
            borderRadius: 10, padding: "12px 14px", marginBottom: 8,
            opacity: s.enabled ? 1 : 0.6,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "#ddd", fontWeight: 700 }}>{s.name}</span>
              <span style={{ fontSize: 10, color, letterSpacing: 1, textTransform: "uppercase" }}>
                {TRIGGER_LABEL[s.trigger_type] || s.trigger_type}
                {s.trigger_value && s.trigger_type === "keyword" && ` · "${s.trigger_value}"`}
                {s.brand && ` · ${s.brand}`}
              </span>
            </div>
            {s.when_to_use && (
              <p style={{ margin: "0 0 6px", fontSize: 11, color: "#888", fontStyle: "italic" }}>{s.when_to_use}</p>
            )}
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
              {s.prompt_fragment}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button onClick={() => toggleEnabled(s)} style={btnSmall(s.enabled ? "#888" : "#00F0FF")}>
                {s.enabled ? "Stäng av" : "Aktivera"}
              </button>
              <button onClick={() => startEdit(s)} style={btnSmall("#888")}>✎ Redigera</button>
              <button onClick={() => remove(s)} style={btnSmall("#ff6644")}>🗑</button>
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
