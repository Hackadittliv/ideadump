import { useState, useRef } from "react";
import ScoreRing from "./ui/ScoreRing.jsx";
import Slider from "./ui/Slider.jsx";
import ProsCons from "./ui/ProsCons.jsx";
import { STATUSES, getBrands, getBrandColorsMap } from "../styles/theme.js";
import { iceTotal } from "../utils/iceCalc.js";
import { exportToCalendar } from "../utils/icsExport.js";
import { validateIdea, tripleCheckIdea, recLabel } from "../utils/research/index.js";
import { googleOAuthConfigured, createCalendarEvent } from "../utils/googleCalendar.js";
import { authedFetch } from "../utils/authedFetch.js";

export default function IdeaCard({ idea, onUpdate, onDelete, expanded, onToggle, onTagClick, allIdeas = [], user }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [validating, setValidating] = useState(null); // null | "smart" | "triple"
  const [validationError, setValidationError] = useState("");
  const [validationOpen, setValidationOpen] = useState(false);
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [notionStatus, setNotionStatus] = useState(""); // "", "syncing", "ok", "error"
  const [notionMsg, setNotionMsg] = useState("");
  const [calStatus, setCalStatus] = useState(""); // "", "syncing", "ok", "error"
  const [calMsg, setCalMsg] = useState("");
  const dateInputRef = useRef(null);

  const handleCalendar = async () => {
    // Försök Google Calendar direkt om OAuth är konfad + användare inloggad
    if (googleOAuthConfigured() && user?.id) {
      setCalStatus("syncing");
      setCalMsg("");
      try {
        const scheduledDate = idea.deadline || new Date().toISOString().slice(0, 10);
        const result = await createCalendarEvent(user.id, idea, scheduledDate);
        setCalStatus("ok");
        setCalMsg("Bokad i Google Calendar");
        onUpdate({ ...idea, googleEventId: result.eventId, googleEventLink: result.htmlLink });
        setTimeout(() => setCalStatus(""), 2500);
        return;
      } catch (e) {
        setCalStatus("error");
        setCalMsg(e.message || "Kunde ej boka direkt");
        // Fallthrough till .ics om direktbokning misslyckas
      }
    }
    // Fallback: ladda ner .ics-fil
    exportToCalendar(idea);
  };

  const syncToNotion = async () => {
    setNotionStatus("syncing");
    setNotionMsg("");
    try {
      const res = await authedFetch("/.netlify/functions/notion-sync", {
        method: "POST",
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setNotionStatus("ok");
      setNotionMsg(data.updated ? "Uppdaterad i Notion" : "Skapad i Notion");
      onUpdate({ ...idea, notionUrl: data.url, notionSyncedAt: new Date().toISOString() });
      setTimeout(() => setNotionStatus(""), 2500);
    } catch (e) {
      setNotionStatus("error");
      setNotionMsg(e.message || "Sync misslyckades");
    }
  };

  const dependsOn = idea.dependsOn || [];
  const blockerIdeas = dependsOn
    .map(id => allIdeas.find(i => i.id === id))
    .filter(Boolean);
  const activeBlockers = blockerIdeas.filter(b => b.status !== "done");
  const isBlocked = activeBlockers.length > 0;

  const toggleDependency = (targetId) => {
    const next = dependsOn.includes(targetId)
      ? dependsOn.filter(id => id !== targetId)
      : [...dependsOn, targetId];
    onUpdate({ ...idea, dependsOn: next });
  };

  const runValidation = async (mode) => {
    setValidating(mode);
    setValidationError("");
    try {
      const fn = mode === "triple" ? tripleCheckIdea : validateIdea;
      const result = await fn(idea);
      onUpdate({
        ...idea,
        validation: {
          ...result,
          searchedAt: new Date().toISOString(),
        },
      });
      setValidationOpen(true);
    } catch (e) {
      setValidationError(e.message || "Okänt fel");
    } finally {
      setValidating(null);
    }
  };
  const ice    = iceTotal(idea);
  const overdue = idea.deadline && new Date(idea.deadline) < new Date() && idea.status !== "done";
  const color = getBrandColorsMap()[idea.brand] || "#888";
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
              {isBlocked && (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  background: "#ffaa0018", border: "1px solid #ffaa0044",
                  color: "#ffaa00", borderRadius: 4, padding: "1px 6px",
                }}>
                  ⛓ Blockerad av {activeBlockers.length}
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

          {/* Lägg till i kalender + Notion-sync */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={e => { e.stopPropagation(); handleCalendar(); }}
              disabled={calStatus === "syncing"}
              style={{
                flex: 1, padding: "11px",
                background: calStatus === "ok" ? "#00ff8818"
                  : calStatus === "error" ? "#ff220018"
                  : idea.googleEventId ? "#4285f412" : "#ffffff06",
                border: `1px solid ${calStatus === "ok" ? "#00ff8844"
                  : calStatus === "error" ? "#ff220044"
                  : idea.googleEventId ? "#4285f444" : "#1e1e3a"}`,
                borderRadius: 10,
                color: calStatus === "ok" ? "#00ff88"
                  : calStatus === "error" ? "#ff6644"
                  : idea.googleEventId ? "#6ba5f7" : "#888",
                fontSize: 12,
                cursor: calStatus === "syncing" ? "wait" : "pointer",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 6,
              }}
            >
              {calStatus === "syncing"
                ? "⏳ Bokar..."
                : calStatus === "ok"
                  ? "✓ " + calMsg
                  : idea.googleEventId
                    ? "📅 Bokad — uppdatera"
                    : "📅 Kalender"}
            </button>
            <button
              onClick={e => { e.stopPropagation(); syncToNotion(); }}
              disabled={notionStatus === "syncing"}
              style={{
                flex: 1, padding: "11px",
                background: notionStatus === "ok" ? "#00ff8818"
                  : notionStatus === "error" ? "#ff220018"
                  : idea.notionUrl ? "#F2B8B412" : "#ffffff06",
                border: `1px solid ${notionStatus === "ok" ? "#00ff8844"
                  : notionStatus === "error" ? "#ff220044"
                  : idea.notionUrl ? "#F2B8B433" : "#1e1e3a"}`,
                borderRadius: 10,
                color: notionStatus === "ok" ? "#00ff88"
                  : notionStatus === "error" ? "#ff6644"
                  : idea.notionUrl ? "#F2B8B4" : "#888",
                fontSize: 12, cursor: notionStatus === "syncing" ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {notionStatus === "syncing"
                ? "🔄 Synkar..."
                : notionStatus === "ok"
                  ? "✓ " + notionMsg
                  : idea.notionUrl
                    ? "📓 Uppdatera Notion"
                    : "📓 Synka till Notion"}
            </button>
          </div>
          {notionStatus === "error" && (
            <p style={{ margin: "-8px 0 12px", fontSize: 11, color: "#ff6644" }}>
              ⚠️ {notionMsg}
            </p>
          )}
          {idea.notionUrl && notionStatus !== "error" && (
            <a href={idea.notionUrl} target="_blank" rel="noopener noreferrer"
               onClick={e => e.stopPropagation()}
               style={{
                 display: "block", marginTop: -8, marginBottom: 14,
                 fontSize: 11, color: "#F2B8B4", textDecoration: "none", textAlign: "center",
               }}>
              Öppna i Notion →
            </a>
          )}

          {/* Marknadsvalidering — Exa + Perplexity + Claude web search */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={e => { e.stopPropagation(); runValidation("smart"); }}
                disabled={validating !== null}
                style={{
                  flex: 1, padding: "11px", background: validating === "smart" ? "#00F0FF18" : "#00F0FF0a",
                  border: "1px solid #00F0FF33", borderRadius: 10, color: "#00F0FF",
                  fontSize: 12, cursor: validating ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  opacity: validating && validating !== "smart" ? 0.5 : 1,
                }}
              >
                {validating === "smart" ? "🔄 Söker via Exa..." : "🔎 Validera mot marknaden"}
              </button>
              {idea.status === "next" && (
                <button
                  onClick={e => { e.stopPropagation(); runValidation("triple"); }}
                  disabled={validating !== null}
                  style={{
                    flex: 1, padding: "11px", background: validating === "triple" ? "#F2B8B418" : "#F2B8B40a",
                    border: "1px solid #F2B8B433", borderRadius: 10, color: "#F2B8B4",
                    fontSize: 12, cursor: validating ? "wait" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    opacity: validating && validating !== "triple" ? 0.5 : 1,
                  }}
                >
                  {validating === "triple" ? "🔄 Tripel-check körs..." : "🔬 Tripel-check"}
                </button>
              )}
            </div>

            {validationError && (
              <div style={{
                marginTop: 8, padding: "8px 12px",
                background: "#ff220012", border: "1px solid #ff220033",
                borderRadius: 8, color: "#ff6644", fontSize: 11,
              }}>
                ⚠️ {validationError}
              </div>
            )}

            {idea.validation && (
              <div style={{
                marginTop: 10, background: "#070714",
                border: `1px solid ${recLabel(idea.validation.recommendation).color}33`,
                borderRadius: 10, padding: "12px 14px",
              }} onClick={e => e.stopPropagation()}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, cursor: "pointer" }}
                     onClick={() => setValidationOpen(v => !v)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 10, color: recLabel(idea.validation.recommendation).color,
                      letterSpacing: 1, textTransform: "uppercase", fontWeight: 600,
                    }}>
                      {idea.validation.mode === "triple" ? "🔬 Tripel-check" : "🔎 Validering"}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: recLabel(idea.validation.recommendation).color,
                    }}>
                      {recLabel(idea.validation.recommendation).label}
                    </span>
                    {typeof idea.validation.noveltyScore === "number" && (
                      <span style={{ fontSize: 10, color: "#666" }}>
                        Novelty {idea.validation.noveltyScore}/10
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "#555" }}>
                    {validationOpen ? "▲" : "▼"}
                  </span>
                </div>

                <p style={{ margin: "0 0 8px", fontSize: 13, color: "#ccc", lineHeight: 1.5 }}>
                  {idea.validation.conclusion}
                </p>

                {validationOpen && (
                  <>
                    {idea.validation.uniqueAngle && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, color: "#00F0FF", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
                          🌟 Unik vinkel
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
                          {idea.validation.uniqueAngle}
                        </p>
                      </div>
                    )}

                    {idea.validation.redFlag && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, color: "#ff6644", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
                          ⚠️ Red flag
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>
                          {idea.validation.redFlag}
                        </p>
                      </div>
                    )}

                    {idea.validation.topCompetitors?.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
                          Topp-konkurrenter
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#aaa" }}>
                          {idea.validation.topCompetitors.map((c, i) => (
                            <li key={i} style={{ marginBottom: 2 }}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {idea.validation.sources?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
                          Källor ({idea.validation.sources.length})
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {idea.validation.sources.slice(0, 10).map((s, i) => (
                            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                               style={{
                                 fontSize: 11, color: "#888", textDecoration: "none",
                                 padding: "6px 10px", background: "#0a0a18",
                                 border: "1px solid #181830", borderRadius: 6,
                                 display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                               }}>
                              <span style={{ color: s.provider === "exa" ? "#00F0FF" : s.provider === "perplexity" ? "#F2B8B4" : "#e8a87c", fontSize: 9, marginRight: 6 }}>
                                {s.provider}
                              </span>
                              {s.title || s.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {idea.validation.mode === "triple" && idea.validation.providersOk && (
                      <div style={{ marginTop: 10, fontSize: 10, color: "#444" }}>
                        Providers:{" "}
                        {Object.entries(idea.validation.providersOk).map(([p, ok]) => (
                          <span key={p} style={{ marginRight: 8, color: ok ? "#00ff8888" : "#ff664488" }}>
                            {ok ? "✓" : "✗"} {p}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 10, fontSize: 9, color: "#444" }}>
                      Kontrollerad {new Date(idea.validation.searchedAt).toLocaleString("sv-SE")}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

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
              {getBrands().map(b => (
                <button key={b}
                  onClick={e => { e.stopPropagation(); onUpdate({ ...idea, brand: b }); }}
                  style={{
                    background: idea.brand === b ? getBrandColorsMap()[b] + "28" : "transparent",
                    border: `1px solid ${idea.brand === b ? getBrandColorsMap()[b] : "#1e1e3a"}`,
                    color: idea.brand === b ? getBrandColorsMap()[b] : "#888",
                    borderRadius: 8, padding: "4px 12px", fontSize: 11, cursor: "pointer",
                  }}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Beroenden */}
          <div style={{ marginBottom: 14 }} onClick={e => e.stopPropagation()}>
            <p style={{ margin: "0 0 8px", fontSize: 10, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
              ⛓ Beroenden — blockerad av
            </p>
            {blockerIdeas.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {blockerIdeas.map(b => {
                  const done = b.status === "done";
                  return (
                    <div key={b.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 12px",
                      background: done ? "#00ff8808" : "#ffaa0008",
                      border: `1px solid ${done ? "#00ff8833" : "#ffaa0033"}`,
                      borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 11, color: done ? "#00ff88" : "#ffaa00", flexShrink: 0 }}>
                        {done ? "✅" : "⏳"}
                      </span>
                      <span style={{ fontSize: 12, color: "#ccc", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.aiAnalysis?.summary?.slice(0, 60) || b.transcript?.slice(0, 60)}
                      </span>
                      <button onClick={() => toggleDependency(b.id)}
                        style={{
                          background: "transparent", border: "none",
                          color: "#666", fontSize: 14, cursor: "pointer", padding: 0,
                        }}>✕</button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#555", fontStyle: "italic" }}>
                Inga beroenden — idén kan köras när som helst.
              </p>
            )}
            <button onClick={() => setShowDepPicker(v => !v)}
              style={{
                width: "100%", padding: "8px", background: "transparent",
                border: "1px dashed #1e1e3a", borderRadius: 8,
                color: "#888", fontSize: 11, cursor: "pointer",
              }}>
              {showDepPicker ? "Stäng" : "+ Lägg till beroende"}
            </button>
            {showDepPicker && (
              <div style={{
                marginTop: 8, maxHeight: 180, overflowY: "auto",
                background: "#080816", border: "1px solid #1e1e3a",
                borderRadius: 8, padding: 6,
              }}>
                {allIdeas
                  .filter(i => i.id !== idea.id && !dependsOn.includes(i.id) && i.status !== "done")
                  .slice(0, 20)
                  .map(i => (
                    <button key={i.id} onClick={() => { toggleDependency(i.id); setShowDepPicker(false); }}
                      style={{
                        width: "100%", textAlign: "left", padding: "6px 8px",
                        background: "transparent", border: "none",
                        color: "#aaa", fontSize: 12, cursor: "pointer",
                        borderRadius: 4, marginBottom: 2,
                      }}>
                      <span style={{ color: getBrandColorsMap()[i.brand] || "#888", fontSize: 9, marginRight: 6 }}>
                        [{i.brand}]
                      </span>
                      {(i.aiAnalysis?.summary || i.transcript || "").slice(0, 70)}
                    </button>
                  ))}
                {allIdeas.filter(i => i.id !== idea.id && !dependsOn.includes(i.id) && i.status !== "done").length === 0 && (
                  <p style={{ margin: 0, padding: "8px 10px", fontSize: 11, color: "#666", fontStyle: "italic" }}>
                    Inga andra aktiva idéer att välja bland.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Deadline */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ margin: "0 0 6px", fontSize: 10, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
              📅 Deadline
            </p>
            {/* Dold native date-input triggas av knappen */}
            <input
              ref={dateInputRef}
              type="date"
              value={idea.deadline || ""}
              onClick={e => e.stopPropagation()}
              onChange={e => onUpdate({ ...idea, deadline: e.target.value || null })}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
            />
            <button
              onClick={e => { e.stopPropagation(); dateInputRef.current?.showPicker?.() || dateInputRef.current?.click(); }}
              style={{
                width: "100%", padding: "12px 16px", textAlign: "left",
                background: "#080816", border: `1px solid ${overdue ? "#ff220044" : idea.deadline ? "#00F0FF33" : "#181830"}`,
                borderRadius: 10, color: overdue ? "#ff6644" : idea.deadline ? "#00F0FF" : "#555",
                fontSize: 14, fontFamily: "inherit", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>📅</span>
              <span>
                {idea.deadline
                  ? new Date(idea.deadline + "T12:00:00").toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                  : "Välj datum"}
              </span>
              {idea.deadline && (
                <span
                  onClick={e => { e.stopPropagation(); onUpdate({ ...idea, deadline: null }); }}
                  style={{ marginLeft: "auto", fontSize: 14, color: "#555", lineHeight: 1 }}
                >✕</span>
              )}
            </button>
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
                    padding: "11px 14px", minHeight: 44,
                    color: "#666", fontSize: 12, cursor: "pointer",
                  }}>Avbryt</button>
                <button onClick={e => { e.stopPropagation(); onDelete(idea.id); }}
                  style={{
                    background: "#ff220018", border: "1px solid #ff220044", borderRadius: 8,
                    padding: "11px 14px", minHeight: 44,
                    color: "#ff6644", fontSize: 12, cursor: "pointer",
                  }}>Radera</button>
              </div>
            ) : (
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                style={{
                  background: "transparent", border: "1px solid #1e1e2e", borderRadius: 8,
                  padding: "0", minWidth: 44, minHeight: 44,
                  color: "#666", fontSize: 14, cursor: "pointer", marginLeft: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
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
