// Söndagsgenomgång — veckoanalys med Claude + kalenderbokning
import { useState } from "react";
import { exportToCalendar } from "../../utils/icsExport.js";
import { authedFetch } from "../../utils/authedFetch.js";
import { getBrandColorsMap } from "../../styles/theme.js";
import { createCalendarEvent, googleOAuthConfigured } from "../../utils/googleCalendar.js";

// Returnera N kommande vardagsdatum som "YYYY-MM-DD"-strängar (start = imorgon).
function nextWorkdays(count, from = new Date()) {
  const out = [];
  const d = new Date(from);
  d.setDate(d.getDate() + 1); // start imorgon
  while (out.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function nextWorkday(from = new Date()) {
  return nextWorkdays(1, from)[0];
}

export default function WeeklyReviewView({ ideas, onUpdateIdea, user }) {
  const [loading, setLoading]   = useState(false);
  const [review, setReview]     = useState(null);
  const [error, setError]       = useState("");
  const [booked, setBooked]     = useState(new Set());
  const [scheduledDates, setScheduledDates] = useState({}); // ideaId → "YYYY-MM-DD"
  const [bookingId, setBookingId] = useState(null);
  const [bulkBooking, setBulkBooking] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  const allActive = ideas.filter(i => i.status === "inbox" || i.status === "next");
  const isBlocked = (idea) => {
    const deps = idea.dependsOn || [];
    if (deps.length === 0) return false;
    return deps.some(id => {
      const blocker = ideas.find(x => x.id === id);
      return blocker && blocker.status !== "done";
    });
  };
  const activeIdeas = allActive.filter(i => !isBlocked(i));
  const blockedCount = allActive.length - activeIdeas.length;
  const overdueIdeas = ideas.filter(i =>
    i.deadline && new Date(i.deadline) < new Date() && i.status !== "done"
  );

  // Decision pressure: Next Actions utan deadline OCH utan kalenderbokning
  // är "ovillkorade åtaganden" — antingen boka eller flytta ur Next.
  const nextWithoutTime = ideas.filter(i =>
    i.status === "next" && !i.deadline && !i.googleEventId
  );

  // Decision pressure 2.0: revenue-handlingar som auto-parkerats senaste 30
  // dagarna pga inaktivitet. Synlig skuld varje gång du öppnar Vecka-fliken.
  const cutoff30d = Date.now() - 30 * 24 * 3600 * 1000;
  const recentlySwept = ideas.filter(i =>
    i.revenueActionStatus === "abandoned"
    && i.revenueOutcome?.note?.startsWith("Auto:")
    && i.revenueOutcome?.completedAt
    && new Date(i.revenueOutcome.completedAt).getTime() > cutoff30d
  ).sort((a, b) =>
    new Date(b.revenueOutcome.completedAt) - new Date(a.revenueOutcome.completedAt)
  );

  const canUseGoogle = googleOAuthConfigured() && !!user?.id;

  const bookOne = async (idea, dateOverride) => {
    setBookingId(idea.id);
    setError("");
    try {
      const date = dateOverride || scheduledDates[idea.id] || nextWorkday();
      if (canUseGoogle) {
        const result = await createCalendarEvent(user.id, idea, date);
        onUpdateIdea({ ...idea, googleEventId: result.eventId, googleEventLink: result.htmlLink });
      } else {
        exportToCalendar(idea);
      }
      setBooked(prev => new Set([...prev, idea.id]));
    } catch (e) {
      setError("Bokning misslyckades: " + e.message);
    } finally {
      setBookingId(null);
    }
  };

  const bulkBook = async () => {
    if (nextWithoutTime.length === 0) return;
    if (!canUseGoogle) {
      setError("Bulk-bokning kräver Google Calendar — koppla i Inställningar.");
      return;
    }
    setBulkBooking(true);
    setBulkMsg(`Bokar ${nextWithoutTime.length} idé${nextWithoutTime.length === 1 ? "" : "er"}...`);
    setError("");

    // Sortera högst-ICE först — de viktigaste får tidigast slot
    const sorted = [...nextWithoutTime].sort((a, b) => {
      const aIce = a.aiAnalysis?.ice ? (a.aiAnalysis.ice.impact + a.aiAnalysis.ice.confidence + a.aiAnalysis.ice.ease) / 3 : 0;
      const bIce = b.aiAnalysis?.ice ? (b.aiAnalysis.ice.impact + b.aiAnalysis.ice.confidence + b.aiAnalysis.ice.ease) / 3 : 0;
      return bIce - aIce;
    });

    const days = nextWorkdays(sorted.length);
    let okCount = 0;
    for (let i = 0; i < sorted.length; i++) {
      try {
        const idea = sorted[i];
        const result = await createCalendarEvent(user.id, idea, days[i]);
        onUpdateIdea({ ...idea, googleEventId: result.eventId, googleEventLink: result.htmlLink });
        setBooked(prev => new Set([...prev, idea.id]));
        okCount++;
      } catch (e) {
        console.error("Bulk-bokning misslyckades för en idé:", e);
      }
    }

    setBulkMsg(`✅ Bokade ${okCount}/${sorted.length} i din IdeaDump-kalender.`);
    setBulkBooking(false);
    setTimeout(() => setBulkMsg(""), 6000);
  };

  const runReview = async () => {
    if (activeIdeas.length === 0) return;
    setLoading(true);
    setError("");
    setReview(null);
    try {
      const res = await authedFetch("/.netlify/functions/weekly-review", {
        method: "POST",
        body: JSON.stringify({ ideas: activeIdeas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReview(data);
    } catch (e) {
      setError("Fel: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (idea) => {
    exportToCalendar(idea);
    setBooked(prev => new Set([...prev, idea.id]));
    if (idea.status !== "next") onUpdateIdea({ ...idea, status: "next" });
  };

  const top3Ideas = review?.top3
    ?.map(t => activeIdeas[t.index])
    .filter(Boolean) ?? [];

  return (
    <div style={{ padding: "24px 20px" }} className="appear">

      {/* Rubrik */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#00F0FF", margin: "0 0 4px" }}>
          📅 Söndagsgenomgång
        </h2>
        <p style={{ margin: 0, fontSize: 11, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
          {activeIdeas.length} aktiva idéer · {overdueIdeas.length > 0 ? `${overdueIdeas.length} försenade` : "inga försenade"}{blockedCount > 0 ? ` · ${blockedCount} blockerade` : ""}
        </p>
      </div>

      {/* Decision pressure 2.0: synlig skuld från auto-parkerade revenue-actions */}
      {recentlySwept.length > 0 && (
        <div style={{
          background: "#88003306", border: "1px solid #88333355",
          borderRadius: 12, padding: "14px 16px", marginBottom: 16,
        }}>
          <p style={{ margin: 0, fontSize: 11, color: "#aa6677", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            💀 {recentlySwept.length} revenue-handling{recentlySwept.length === 1 ? "" : "ar"} parkerades senaste 30 dagar
          </p>
          <p style={{ margin: "6px 0 10px", fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
            Inget "Gjorde det"-kvitto inom 7 dagar. Detta är inte fel — men det är synlig skuld. Antingen är handlingarna fel typ, eller så är det andra saker som tar tid.
          </p>
          {recentlySwept.slice(0, 3).map(idea => {
            const color = getBrandColorsMap()[idea.brand] || "#888";
            const text = idea.aiAnalysis?.revenueAction?.description?.slice(0, 80)
              || idea.aiAnalysis?.summary?.slice(0, 80)
              || idea.transcript?.slice(0, 80);
            const when = new Date(idea.revenueOutcome.completedAt);
            return (
              <div key={idea.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: 0.5, marginRight: 8 }}>{idea.brand}</span>
                <span style={{ fontSize: 12, color: "#999", flex: 1, lineHeight: 1.5 }}>{text}</span>
                <span style={{ fontSize: 10, color: "#666", marginLeft: 8, flexShrink: 0 }}>
                  {when.toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                </span>
              </div>
            );
          })}
          {recentlySwept.length > 3 && (
            <p style={{ margin: "8px 0 0", fontSize: 10, color: "#666", letterSpacing: 0.5 }}>
              + {recentlySwept.length - 3} till — filtrera på status=Parkera för att se alla
            </p>
          )}
        </div>
      )}

      {/* Decision pressure: Next Actions utan tid */}
      {nextWithoutTime.length > 0 && (
        <div style={{
          background: "#ffaa0008", border: "1px solid #ffaa0033",
          borderRadius: 12, padding: "14px 16px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#ffaa00", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              🎯 Next Actions utan tid · {nextWithoutTime.length}
            </p>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
            Dessa väntar på en plats i kalendern. Antingen boka tid — eller flytta ut ur Next.
          </p>

          {canUseGoogle && (
            <button
              onClick={bulkBook}
              disabled={bulkBooking}
              style={{
                width: "100%", padding: "10px", marginBottom: 10,
                background: bulkBooking ? "#0a0a1a" : "#ffaa0014",
                border: `1px solid ${bulkBooking ? "#222" : "#ffaa0044"}`,
                borderRadius: 10, color: bulkBooking ? "#666" : "#ffaa00",
                fontSize: 12, cursor: bulkBooking ? "wait" : "pointer", minHeight: 40,
              }}
            >
              {bulkBooking ? "Bokar..." : `📅 Auto-boka alla över ${nextWithoutTime.length} vardag${nextWithoutTime.length === 1 ? "" : "ar"}`}
            </button>
          )}

          {bulkMsg && (
            <p style={{ margin: "0 0 10px", fontSize: 11, color: "#00ff88", lineHeight: 1.5 }}>{bulkMsg}</p>
          )}

          {nextWithoutTime.map(idea => {
            const color = getBrandColorsMap()[idea.brand] || "#888";
            const ice = idea.aiAnalysis?.ice
              ? ((idea.aiAnalysis.ice.impact + idea.aiAnalysis.ice.confidence + idea.aiAnalysis.ice.ease) / 3).toFixed(1)
              : "–";
            const isBooked = booked.has(idea.id);
            const isLoading = bookingId === idea.id;
            const date = scheduledDates[idea.id] || nextWorkday();
            return (
              <div key={idea.id} style={{
                background: "#0a0a18", border: "1px solid #1a1a2e",
                borderRadius: 10, padding: "10px 12px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color, fontWeight: 700 }}>{idea.brand}</span>
                  <span style={{ fontSize: 10, color: "#666", fontFamily: "DM Mono, monospace" }}>ICE {ice}</span>
                </div>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#bbb", lineHeight: 1.4 }}>
                  {idea.aiAnalysis?.nextActionSuggestion || idea.aiAnalysis?.summary?.slice(0, 80) || idea.transcript?.slice(0, 80)}
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setScheduledDates({ ...scheduledDates, [idea.id]: e.target.value })}
                    disabled={isBooked || isLoading}
                    style={{
                      flex: 1, padding: "8px 10px", minHeight: 38,
                      background: "#02020e", border: "1px solid #1e1e3a", borderRadius: 8,
                      color: "#ccc", fontSize: 12, outline: "none",
                    }}
                  />
                  <button
                    onClick={() => bookOne(idea)}
                    disabled={isBooked || isLoading}
                    style={{
                      padding: "8px 14px", minHeight: 38,
                      background: isBooked ? "#00ff8810" : "#00F0FF14",
                      border: `1px solid ${isBooked ? "#00ff8844" : "#00F0FF44"}`,
                      borderRadius: 8,
                      color: isBooked ? "#00ff88" : "#00F0FF",
                      fontSize: 12, fontWeight: 700,
                      cursor: isBooked || isLoading ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isLoading ? "..." : isBooked ? "✓ Bokad" : "📅 Boka"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Försenade idéer */}
      {overdueIdeas.length > 0 && (
        <div style={{
          background: "#ff220008", border: "1px solid #ff220033",
          borderRadius: 12, padding: "12px 16px", marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#ff6644", fontWeight: 700, letterSpacing: 1 }}>
            ⚠️ FÖRSENADE DEADLINES
          </p>
          {overdueIdeas.map(idea => (
            <div key={idea.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#ccc", flex: 1 }}>
                {idea.aiAnalysis?.summary?.slice(0, 60) || idea.transcript?.slice(0, 60)}...
              </p>
              <span style={{ fontSize: 11, color: "#ff6644", marginLeft: 12, flexShrink: 0 }}>
                {new Date(idea.deadline).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tom vy */}
      {activeIdeas.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🎉</div>
          <p style={{ color: "#333", fontSize: 14 }}>Inget i Inbox eller Next Action just nu.</p>
        </div>
      ) : (
        <>
          {/* Analysera-knapp */}
          {!review && (
            <button onClick={runReview} disabled={loading} style={{
              width: "100%", padding: "14px",
              background: loading ? "#0a0a1a" : "linear-gradient(135deg, #00F0FF18 0%, #F2B8B418 100%)",
              border: `1px solid ${loading ? "#111128" : "#00F0FF33"}`,
              borderRadius: 12, color: loading ? "#444" : "#00F0FF",
              fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer",
              marginBottom: 20,
            }}>
              {loading ? "Claude analyserar veckan..." : `✨ Analysera ${activeIdeas.length} idéer`}
            </button>
          )}

          {error && (
            <p style={{ fontSize: 12, color: "#ff6644", marginBottom: 16 }}>{error}</p>
          )}

          {/* Veckoanalys-resultat */}
          {review && (
            <div className="appear">

              {/* Veckans insight */}
              <div style={{
                background: "#00F0FF08", border: "1px solid #00F0FF22",
                borderRadius: 12, padding: "14px 16px", marginBottom: 14,
              }}>
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "#00F0FF", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
                  🔍 Veckans analys
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#ccc", lineHeight: 1.65 }}>
                  {review.weekInsight}
                </p>
              </div>

              {/* Snabbaste intäkten */}
              {review.fastestRevenue && (
                <div style={{
                  background: "#00ff8808", border: "1px solid #00ff8833",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 14,
                }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, color: "#00ff88", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
                    💰 Snabbaste vägen till intäkt
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#ccc", lineHeight: 1.65 }}>
                    {review.fastestRevenue}
                  </p>
                </div>
              )}

              {/* Varning */}
              {review.warning && (
                <div style={{
                  background: "#ffaa0008", border: "1px solid #ffaa0033",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 20,
                }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, color: "#ffaa00", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
                    ⚠️ Coach-varning
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#ccc", lineHeight: 1.65 }}>
                    {review.warning}
                  </p>
                </div>
              )}

              {/* Topp 3 att agera på */}
              {top3Ideas.length > 0 && (
                <>
                  <p style={{ fontSize: 11, color: "#555", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                    🎯 Agera på dessa den här veckan
                  </p>
                  {top3Ideas.map((idea, i) => {
                    const reason = review.top3[i]?.reason;
                    const color = getBrandColorsMap()[idea.brand] || "#888";
                    const isBooked = booked.has(idea.id);
                    return (
                      <div key={idea.id} style={{
                        background: "#0c0c1e", border: `1px solid ${color}33`,
                        borderRadius: 12, padding: "14px 16px", marginBottom: 10,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ flex: 1 }}>
                            <span style={{
                              background: color + "22", color, borderRadius: 6,
                              padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                            }}>{idea.brand}</span>
                            <p style={{ margin: "8px 0 4px", fontSize: 13, color: "#ddd", lineHeight: 1.5 }}>
                              {idea.aiAnalysis?.summary || idea.transcript?.slice(0, 100)}
                            </p>
                            {reason && (
                              <p style={{ margin: 0, fontSize: 12, color: "#888", fontStyle: "italic" }}>
                                {reason}
                              </p>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                            <span style={{
                              fontSize: 11, color: "#888", fontFamily: "DM Mono, monospace",
                              textAlign: "right",
                            }}>
                              ICE {idea.aiAnalysis ? ((idea.aiAnalysis.ice?.impact + idea.aiAnalysis.ice?.confidence + idea.aiAnalysis.ice?.ease) / 3).toFixed(1) : "–"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBook(idea)}
                          disabled={isBooked}
                          style={{
                            width: "100%", marginTop: 12, padding: "10px",
                            background: isBooked ? "#00ff8810" : "#ffffff08",
                            border: `1px solid ${isBooked ? "#00ff8833" : "#1e1e3a"}`,
                            borderRadius: 10, color: isBooked ? "#00ff88" : "#555",
                            fontSize: 12, cursor: isBooked ? "default" : "pointer",
                          }}>
                          {isBooked ? "✅ Bokad i kalender" : "📅 Boka in nu"}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Kör igen */}
              <button onClick={() => { setReview(null); setBooked(new Set()); }} style={{
                width: "100%", marginTop: 8, padding: "10px",
                background: "transparent", border: "1px solid #222240",
                borderRadius: 10, color: "#666", fontSize: 12, cursor: "pointer",
              }}>
                🔄 Kör ny analys
              </button>
            </div>
          )}

          {/* Alla aktiva idéer */}
          {!review && (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 11, color: "#777", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                Aktiva idéer
              </p>
              {activeIdeas.map(idea => {
                const color = getBrandColorsMap()[idea.brand] || "#888";
                const overdue = idea.deadline && new Date(idea.deadline) < new Date();
                return (
                  <div key={idea.id} style={{
                    background: "#0a0a18", border: `1px solid ${overdue ? "#ff220033" : "#111128"}`,
                    borderRadius: 10, padding: "12px 14px", marginBottom: 8,
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 10, color, fontWeight: 700 }}>{idea.brand}</span>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#aaa", lineHeight: 1.4 }}>
                        {idea.aiAnalysis?.summary?.slice(0, 70) || idea.transcript?.slice(0, 70)}...
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {idea.deadline && (
                        <p style={{ margin: 0, fontSize: 10, color: overdue ? "#ff6644" : "#777" }}>
                          {overdue ? "⚠️ " : ""}{new Date(idea.deadline).toLocaleDateString("sv-SE", { day: "numeric", month: "short" })}
                        </p>
                      )}
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: idea.status === "next" ? "#00F0FF" : "#666" }}>
                        {idea.status === "next" ? "🎯 Next" : "📥 Inbox"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
