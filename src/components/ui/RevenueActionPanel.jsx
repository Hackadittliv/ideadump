// Revenue Action-block i IdeaCard. Visar Claudes föreslagna marknadshandling
// och tvingar fram ett val: gjort (med utfall), avbrutet, eller väntar.
import { useState } from "react";
import {
  REVENUE_ACTION_LABEL, REVENUE_ACTION_ICON, REVENUE_ACTION_COLOR,
  REVENUE_STATUSES, hasActionableRevenue,
  markRevenueDone, markRevenueAbandoned, resetRevenueStatus,
} from "../../utils/revenueActions.js";

export default function RevenueActionPanel({ idea, onUpdate }) {
  const [editing, setEditing] = useState(null); // null | "done" | "abandon"
  const [revenueSek, setRevenueSek] = useState("");
  const [note, setNote] = useState("");

  if (!hasActionableRevenue(idea)) {
    if (idea?.aiAnalysis?.revenueAction?.type === "no_action") {
      return (
        <div style={{
          background: "#0a0a18", border: "1px solid #1a1a2e",
          borderRadius: 10, padding: "8px 12px", marginBottom: 10,
        }}>
          <span style={{ fontSize: 11, color: "#666" }}>
            — Ingen revenue-handling (intern/system-idé)
          </span>
        </div>
      );
    }
    return null;
  }

  const ra = idea.aiAnalysis.revenueAction;
  const status = idea.revenueActionStatus || REVENUE_STATUSES.PLANNED;
  const color = REVENUE_ACTION_COLOR[ra.type] || "#00F0FF";
  const icon = REVENUE_ACTION_ICON[ra.type] || "💡";
  const label = REVENUE_ACTION_LABEL[ra.type] || ra.type;

  const submitDone = (e) => {
    e?.stopPropagation();
    const sek = revenueSek.trim() === "" ? null : Number(revenueSek);
    onUpdate(markRevenueDone(idea, { revenueSek: sek, note }));
    setEditing(null);
    setRevenueSek("");
    setNote("");
  };

  const submitAbandon = (e) => {
    e?.stopPropagation();
    onUpdate(markRevenueAbandoned(idea, note));
    setEditing(null);
    setNote("");
  };

  const reset = (e) => {
    e?.stopPropagation();
    onUpdate(resetRevenueStatus(idea));
  };

  // Visa utfall om done/abandoned
  if (status === REVENUE_STATUSES.DONE || status === REVENUE_STATUSES.ABANDONED) {
    const out = idea.revenueOutcome || {};
    const isDone = status === REVENUE_STATUSES.DONE;
    return (
      <div style={{
        background: isDone ? "#00ff8808" : "#88888808",
        border: `1px solid ${isDone ? "#00ff8833" : "#33333366"}`,
        borderRadius: 10, padding: "10px 14px", marginBottom: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: isDone ? "#00ff88" : "#888", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            {isDone ? `✓ Genomförd · ${label}` : `✗ Avbruten · ${label}`}
          </span>
          <button onClick={reset} style={{
            background: "transparent", border: "1px solid #1e1e3a",
            borderRadius: 8, padding: "3px 8px", color: "#666",
            fontSize: 10, cursor: "pointer",
          }}>Ångra</button>
        </div>
        {isDone && out.revenueSek != null && (
          <p style={{ margin: "4px 0", fontSize: 14, color: "#00ff88", fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
            {out.revenueSek.toLocaleString("sv-SE")} SEK
          </p>
        )}
        {out.note && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>{out.note}</p>
        )}
      </div>
    );
  }

  // Edit-form (done eller abandon)
  if (editing) {
    return (
      <div style={{
        background: "#0c0c1e", border: `1px solid ${color}55`,
        borderRadius: 10, padding: "12px 14px", marginBottom: 10,
      }} onClick={(e) => e.stopPropagation()}>
        <p style={{ margin: "0 0 8px", fontSize: 11, color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
          {editing === "done" ? "✓ Markera genomförd" : "✗ Markera avbruten"}
        </p>
        {editing === "done" && (
          <>
            <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>
              Tjänade SEK (valfritt — 0 om bara lärdom)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={revenueSek}
              onChange={(e) => setRevenueSek(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </>
        )}
        <label style={{ display: "block", fontSize: 11, color: "#888", marginBottom: 4 }}>
          {editing === "done" ? "Vad hände?" : "Varför avbruten?"}
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={editing === "done" ? "T.ex. 'Bokade möte med X' eller 'Kund sa nej, fel pris'" : "T.ex. 'Insåg att fel målgrupp'"}
          style={inputStyle}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button
            onClick={editing === "done" ? submitDone : submitAbandon}
            style={{
              flex: 1, padding: "10px", minHeight: 38,
              background: editing === "done" ? "#00ff8814" : "#88888814",
              border: `1px solid ${editing === "done" ? "#00ff8855" : "#88888855"}`,
              borderRadius: 8,
              color: editing === "done" ? "#00ff88" : "#aaa",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >Spara</button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(null); }}
            style={{
              padding: "10px 14px", minHeight: 38,
              background: "transparent", border: "1px solid #1e1e3a",
              borderRadius: 8, color: "#666", fontSize: 12, cursor: "pointer",
            }}
          >Avbryt</button>
        </div>
      </div>
    );
  }

  // Default: planned, visa handling + två val
  return (
    <div style={{
      background: `${color}0a`, border: `1px solid ${color}44`,
      borderRadius: 10, padding: "10px 14px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
          💰 Revenue · {icon} {label}
        </span>
        {ra.timeBox && (
          <span style={{ fontSize: 10, color: "#888" }}>{ra.timeBox}</span>
        )}
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#ddd", lineHeight: 1.5 }}>
        {ra.description}
      </p>
      {ra.reasoning && (
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#888", fontStyle: "italic", lineHeight: 1.5 }}>
          {ra.reasoning}
        </p>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setEditing("done"); }}
          style={{
            flex: 1, padding: "8px", minHeight: 38,
            background: "#00ff8814", border: "1px solid #00ff8844",
            borderRadius: 8, color: "#00ff88", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}
        >✓ Gjorde det</button>
        <button
          onClick={(e) => { e.stopPropagation(); setEditing("abandon"); }}
          style={{
            padding: "8px 12px", minHeight: 38,
            background: "transparent", border: "1px solid #88888833",
            borderRadius: 8, color: "#888", fontSize: 12, cursor: "pointer",
          }}
        >Avbryt</button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", marginBottom: 8,
  background: "#02020e", border: "1px solid #1e1e3a", borderRadius: 8,
  color: "#ccc", fontSize: 14, outline: "none", boxSizing: "border-box",
};
