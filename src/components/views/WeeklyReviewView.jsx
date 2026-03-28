// Söndagsgenomgång — veckoanalys med Claude + kalenderbokning
import { useState } from "react";
import { exportToCalendar } from "../../utils/icsExport.js";
import { BRAND_COLORS } from "../../styles/theme.js";

export default function WeeklyReviewView({ ideas, onUpdateIdea }) {
  const [loading, setLoading]   = useState(false);
  const [review, setReview]     = useState(null);
  const [error, setError]       = useState("");
  const [booked, setBooked]     = useState(new Set());

  const activeIdeas = ideas.filter(i => i.status === "inbox" || i.status === "next");
  const overdueIdeas = ideas.filter(i =>
    i.deadline && new Date(i.deadline) < new Date() && i.status !== "done"
  );

  const runReview = async () => {
    if (activeIdeas.length === 0) return;
    setLoading(true);
    setError("");
    setReview(null);
    try {
      const res = await fetch("/.netlify/functions/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          {activeIdeas.length} aktiva idéer · {overdueIdeas.length > 0 ? `${overdueIdeas.length} försenade` : "inga försenade"}
        </p>
      </div>

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
                    const color = BRAND_COLORS[idea.brand] || "#888";
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
                const color = BRAND_COLORS[idea.brand] || "#888";
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
