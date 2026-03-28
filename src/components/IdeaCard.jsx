import { useState } from "react";
import ScoreRing from "./ui/ScoreRing.jsx";
import Slider from "./ui/Slider.jsx";
import ProsCons from "./ui/ProsCons.jsx";
import { BRANDS, STATUSES, BRAND_COLORS } from "../styles/theme.js";
import { iceTotal } from "../utils/iceCalc.js";
import { exportToCalendar } from "../utils/icsExport.js";

export default function IdeaCard({ idea, onUpdate, onDelete, expanded, onToggle, onTagClick }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ice    = iceTotal(idea);
  const overdue = idea.deadline && new Date(idea.deadline) < new Date() && idea.status !== "done";
  const color = BRAND_COLORS[idea.brand] || "#888";
  const ms = idea.manualScores || {};
  const ai = idea.aiAnalysis?.ice || {};
  const energyWarning = idea.aiAnalysis?.energyWarning;
  const warningColor = energyWarning === "distraction" ? "#ff6644" : "#00ff88";

  return (
    <div style={{
      background: "linear-gradient(135deg,#0c0c1e 0%,#0f0f24 100%)",
      border: `1px solid ${expanded ? color + "55" : "#181830"}`,
      borderRadius: 16, padding: "16px 18px", marginBottom: 12,
      boxShadow: expanded ? `0 0 24px ${color}18` : "none",
      transition: "all 0.25s ease",
    }}>
      {/* Kortets huvud — klickbart för expand */}
      <div onClick={onToggle} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7, flexWrap: "wrap" }}>
              <span style={{
                background: color + "22", color, borderRadius: 6,
                padding: "2px 9px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
              }}>
                {idea.brand}
              </span>
              {energyWarning && energyWarning !== "neutral" && (
                <span style={{
                  background: warningColor + "18", border: `1px solid ${warningColor}44`,
                  color: warningColor, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 600,
                }}>
                  {energyWarning === "distraction" ? "⚠️ Distraction?" : "🔥 Genuine"}
                </span>
              )}
              <span style={{ fontSize: 10, color: "#777" }}>
                {new Date(idea.createdAt).toLocaleDateString("sv-SE", {
                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
              {idea.deadline && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: overdue ? "#ff6644" : "#888",
                  background: overdue ? "#ff220012" : "transparent",
                  borderRadius: 4, padding: overdue ? "1px 5px" : 0,
                }}>
                  {overdue ? "⚠️ " : "📅 "}
                  {new Date(idea.deadline).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: 14, color: "#ddd", lineHeight: 1.55 }}>
              {idea.aiAnalysis?.summary || idea.transcript?.slice(0, 130) + (idea.transcript?.length > 130 ? "..." : "")}
            </p>

            {idea.aiAnalysis?.coachComment && (
              <p style={{
                margin: "8px 0 0", fontSize: 12, color: "#F2B8B4", fontStyle: "italic",
                lineHeight: 1.5, borderLeft: "2px solid #F2B8B444", paddingLeft: 10,
              }}>
                {idea.aiAnalysis.coachComment}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {ice > 0 && <ScoreRing value={ice} color={color} label="ICE" />}
            {idea.aiAnalysis?.energyScore && (
              <ScoreRing value={idea.aiAnalysis.energyScore} color="#F2B8B4" label="⚡" />
            )}
          </div>
        </div>

        {/* Statusrad */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 10 }}>
          {STATUSES.map(s => (
            <button key={s.key}
              onClick={e => { e.stopPropagation(); onUpdate({ ...idea, status: s.key }); }}
              style={{
                background: idea.status === s.key ? color + "28" : "transparent",
                border: `1px solid ${idea.status === s.key ? color : "#1e1e3a"}`,
                color: idea.status === s.key ? color : "#888",
                borderRadius: 8, padding: "10px 12px", fontSize: 11, cursor: "pointer",
                transition: "all 0.15s", minHeight: 44,
              }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expanderat innehåll */}
      {expanded && (
        <div style={{ marginTop: 18, borderTop: "1px solid #181830", paddingTop: 18 }}>

          {idea.aiAnalysis?.nextActionSuggestion && (
            <div style={{
              background: "#00F0FF0d", border: "1px solid #00F0FF28",
              borderRadius: 10, padding: "10px 14px", marginBottom: 10,
            }}>
              <div style={{ fontSize: 10, color: "#00F0FF", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                🎯 Nästa steg
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>
                {idea.aiAnalysis.nextActionSuggestion}
              </p>
            </div>
          )}

          {/* Lägg till i kalender */}
          <button
            onClick={e => { e.stopPropagation(); exportToCalendar(idea); }}
            style={{
              width: "100%", marginBottom: 16, padding: "11px",
              background: "#ffffff06", border: "1px solid #1e1e3a",
              borderRadius: 10, color: "#888", fontSize: 12,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 6,
            }}
          >
            📅 Lägg till i Kalender
          </button>

          {(idea.aiAnalysis?.pros?.length > 0 || idea.aiAnalysis?.cons?.length > 0) && (
            <ProsCons pros={idea.aiAnalysis.pros} cons={idea.aiAnalysis.cons} />
          )}

          {idea.aiAnalysis?.biggestRisk && (
            <div style={{
              background: "#ff220008", border: "1px solid #ff220028",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "#ff6644", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                ⚠️ Största risken
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>
                {idea.aiAnalysis.biggestRisk}
              </p>
            </div>
          )}

          {idea.aiAnalysis?.whyThisMatters && (
            <div style={{
              background: "#F2B8B408", border: "1px solid #F2B8B428",
              borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 10, color: "#F2B8B4", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                🌟 Varför detta spelar roll
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>
                {idea.aiAnalysis.whyThisMatters}
              </p>
            </div>
          )}

          {idea.aiAnalysis && (
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 18 }}>
              {["impact", "confidence", "ease"].map(k => (
                <ScoreRing key={k} value={ms[k] ?? ai[k] ?? 5} color={color} size={56} label={k} />
              ))}
              <ScoreRing value={idea.aiAnalysis.potentialScore || 0} color="#F2B8B4" size={56} label="potential" />
            </div>
          )}

          {idea.aiAnalysis?.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {idea.aiAnalysis.tags.map(t => (
                <button key={t} onClick={e => { e.stopPropagation(); onTagClick?.(t); }}
                  style={{
                    background: color + "18", border: `1px solid ${color}33`,
                    color, borderRadius: 20, padding: "4px 10px", fontSize: 11,
                    cursor: onTagClick ? "pointer" : "default",
                  }}>#{t}</button>
              ))}
            </div>
          )}

          {/* Manuell scoring */}
          <div style={{ background: "#080816", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
              Justera scoring
            </p>
            {["impact", "confidence", "ease"].map(k => (
              <Slider key={k} label={k} color={color}
                value={ms[k] ?? ai[k] ?? 5}
                onChange={val => onUpdate({ ...idea, manualScores: { ...ms, [k]: val } })} />
            ))}
            <Slider label="Energi" color="#F2B8B4"
              value={ms.energy ?? idea.aiAnalysis?.energyScore ?? 5}
              onChange={val => onUpdate({ ...idea, manualScores: { ...ms, energy: val } })} />
          </div>

          {/* Varumärke */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
              Varumärke
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BRANDS.map(b => (
                <button key={b}
                  onClick={e => { e.stopPropagation(); onUpdate({ ...idea, brand: b }); }}
                  style={{
                    background: idea.brand === b ? BRAND_COLORS[b] + "28" : "transparent",
                    border: `1px solid ${idea.brand === b ? BRAND_COLORS[b] : "#1e1e3a"}`,
                    color: idea.brand === b ? BRAND_COLORS[b] : "#888",
                    borderRadius: 8, padding: "4px 12px", fontSize: 11, cursor: "pointer",
                  }}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px", fontSize: 10, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
              📅 Deadline
            </p>
            <input
              type="date"
              value={idea.deadline || ""}
              onClick={e => e.stopPropagation()}
              onChange={e => onUpdate({ ...idea, deadline: e.target.value || null })}
              style={{
                background: "#080816", border: `1px solid ${overdue ? "#ff220044" : "#181830"}`,
                borderRadius: 10, padding: "10px 12px", color: overdue ? "#ff6644" : "#aaa",
                fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%",
                boxSizing: "border-box",
              }}
            />
            {idea.deadline && (
              <button
                onClick={e => { e.stopPropagation(); onUpdate({ ...idea, deadline: null }); }}
                style={{
                  marginTop: 4, background: "none", border: "none",
                  color: "#666", fontSize: 11, cursor: "pointer", padding: 0,
                }}>
                Rensa datum
              </button>
            )}
          </div>

          {/* Anteckningar */}
          <textarea value={idea.notes || ""}
            onClick={e => e.stopPropagation()}
            onChange={e => onUpdate({ ...idea, notes: e.target.value })}
            placeholder="Dina egna anteckningar..."
            style={{
              width: "100%", minHeight: 70, background: "#080816", border: "1px solid #181830",
              borderRadius: 10, padding: 12, color: "#aaa", fontSize: 16, fontFamily: "inherit",
              resize: "vertical", boxSizing: "border-box", outline: "none",
            }} />

          {/* Originaltranskript + radera */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <details style={{ flex: 1 }}>
              <summary style={{ fontSize: 11, color: "#666", cursor: "pointer", userSelect: "none" }}>
                Visa originaltranskript
              </summary>
              <p style={{ fontSize: 12, color: "#777", marginTop: 8, lineHeight: 1.6, fontStyle: "italic" }}>
                "{idea.transcript}"
              </p>
            </details>
            {confirmDelete ? (
              <div style={{ display: "flex", gap: 6, marginLeft: 12 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => setConfirmDelete(false)}
                  style={{
                    background: "transparent", border: "1px solid #333", borderRadius: 8,
                    padding: "6px 10px", color: "#666", fontSize: 11, cursor: "pointer",
                  }}>Avbryt</button>
                <button onClick={e => { e.stopPropagation(); onDelete(idea.id); }}
                  style={{
                    background: "#ff220018", border: "1px solid #ff220044", borderRadius: 8,
                    padding: "6px 10px", color: "#ff6644", fontSize: 11, cursor: "pointer",
                  }}>Radera</button>
              </div>
            ) : (
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                style={{
                  background: "transparent", border: "1px solid #1e1e2e", borderRadius: 8,
                  padding: "6px 12px", color: "#666", fontSize: 12, cursor: "pointer", marginLeft: 12,
                }}>
                🗑
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
