// Agent-vyn: tre paneler — Lärdomar, Tekniker, Utvärdering.
// Liknar "Learning"-tabben i andra AI-verktyg där man ser vad agenten lärt sig
// och hur den presterar. Pending-räknaren synkas till BottomNav-badgen.
import { useState } from "react";
import MemoriesPanel from "./MemoriesPanel.jsx";
import SkillsPanel from "./SkillsPanel.jsx";
import RubricsPanel from "./RubricsPanel.jsx";

const PANELS = [
  { key: "memories", label: "Lärdomar",   icon: "🧠" },
  { key: "skills",   label: "Tekniker",   icon: "🛠" },
  { key: "rubrics",  label: "Utvärdering", icon: "📊" },
];

export default function ReflectionsView({ flash, onPendingCountChange }) {
  const [panel, setPanel] = useState("memories");

  return (
    <div style={{ padding: "24px 20px" }} className="appear">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#00F0FF", margin: "0 0 4px" }}>
          🧠 Agent-minne
        </h2>
        <p style={{ margin: 0, fontSize: 11, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
          Vad Claude vet om dig + hur den presterar
        </p>
      </div>

      <div style={{
        display: "flex", gap: 4, marginBottom: 18,
        background: "#0a0a18", border: "1px solid #1e1e3a",
        borderRadius: 10, padding: 4,
      }}>
        {PANELS.map((p) => {
          const active = panel === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setPanel(p.key)}
              style={{
                flex: 1, padding: "8px 6px", minHeight: 38,
                background: active ? "linear-gradient(135deg, #00F0FF22 0%, #F2B8B422 100%)" : "transparent",
                border: active ? "1px solid #00F0FF44" : "1px solid transparent",
                borderRadius: 8,
                color: active ? "#00F0FF" : "#888",
                fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer",
                letterSpacing: 0.2,
              }}
            >
              {p.icon} {p.label}
            </button>
          );
        })}
      </div>

      {panel === "memories" && (
        <MemoriesPanel flash={flash} onPendingCountChange={onPendingCountChange} />
      )}
      {panel === "skills" && (
        <SkillsPanel flash={flash} />
      )}
      {panel === "rubrics" && (
        <RubricsPanel />
      )}
    </div>
  );
}
