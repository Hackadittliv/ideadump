// Landningssida — IdeaDump Beta
import { useState } from "react";

const FEATURES = [
  {
    icon: "🎙",
    title: "Dumpa med rösten",
    desc: "Säg 'Hej Siri, dumpa en idé' — mikrofonen startar direkt. Inga knappar, inget friktion.",
  },
  {
    icon: "🤖",
    title: "Claude analyserar direkt",
    desc: "ICE-scoring, pros & cons, största risken, coachkommentar och konkret nästa steg — på sekunder.",
  },
  {
    icon: "📅",
    title: "Söndagsgenomgång",
    desc: "Varje vecka pekar Claude ut dina 3 bästa idéer och snabbaste vägen till intäkt. Du bokar in dem med ett tryck.",
  },
  {
    icon: "⚡",
    title: "Distraction filter",
    desc: "Claude flaggar direkt när en idé är en distraction — inte en möjlighet. Ärlighet istället för falsk uppmuntran.",
  },
];

export default function LandingView({ onShowLogin }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [reason, setReason]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/.netlify/functions/beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Något gick fel");
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const input = {
    width: "100%", padding: "14px 16px", boxSizing: "border-box",
    background: "#070714", border: "1px solid #1a1a2e", borderRadius: 12,
    color: "#e0e0e0", fontSize: 16, fontFamily: "inherit", outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 0%, #060618 0%, #02020e 100%)",
      color: "#e0e0e0",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .appear { animation: fade-up 0.5s ease both; }
        .appear-2 { animation: fade-up 0.5s 0.1s ease both; }
        .appear-3 { animation: fade-up 0.5s 0.2s ease both; }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0" }}>
          <div>
            <span style={{
              fontSize: 20, fontWeight: 700,
              background: "linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>IdeaDump</span>
            <span style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginLeft: 8 }}>BETA</span>
          </div>
          <button onClick={onShowLogin} style={{
            background: "transparent", border: "1px solid #1a1a2e",
            borderRadius: 10, padding: "8px 16px", color: "#555",
            fontSize: 13, cursor: "pointer",
          }}>Logga in</button>
        </div>

        {/* Hero */}
        <div className="appear" style={{ paddingTop: 40, paddingBottom: 48 }}>
          <div style={{
            display: "inline-block", background: "#00F0FF12",
            border: "1px solid #00F0FF28", borderRadius: 20,
            padding: "4px 14px", fontSize: 11, color: "#00F0FF",
            letterSpacing: 2, textTransform: "uppercase", marginBottom: 20,
          }}>
            Privat Beta — Svenska Entreprenörer
          </div>

          <h1 style={{
            fontSize: 36, fontWeight: 700, lineHeight: 1.2,
            letterSpacing: -1, margin: "0 0 20px",
          }}>
            Sluta tappa bra idéer.{" "}
            <span style={{
              background: "linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Dumpa dem istället.
            </span>
          </h1>

          <p style={{ fontSize: 17, color: "#888", lineHeight: 1.7, margin: "0 0 32px" }}>
            IdeaDump fångar dina idéer med rösten, analyserar dem med Claude AI och hjälper dig välja vad du faktiskt ska agera på — den här veckan.
          </p>

          {/* CTA-pil ner */}
          <div style={{ textAlign: "center", color: "#333", fontSize: 20 }}>↓</div>
        </div>

        {/* Väntelista-formulär */}
        <div className="appear-2" style={{
          background: "linear-gradient(135deg, #0c0c1e 0%, #0f0f24 100%)",
          border: "1px solid #00F0FF28", borderRadius: 20,
          padding: "28px 24px", marginBottom: 48,
        }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>Du är med på listan!</h2>
              <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: 0 }}>
                Vi hör av oss när din plats är redo.<br />Kolla mejlen — ett bekräftelsemail är på väg.
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
                Gå med i betaversionen
              </h2>
              <p style={{ fontSize: 13, color: "#555", margin: "0 0 22px" }}>
                Begränsat antal platser. Gratis under beta.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="text" placeholder="Ditt namn" value={name}
                  onChange={e => setName(e.target.value)}
                  style={input}
                />
                <input
                  type="email" placeholder="Din e-post *" value={email}
                  onChange={e => setEmail(e.target.value)}
                  required style={input}
                />
                <textarea
                  placeholder="Vad jobbar du med? (valfritt)"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  style={{ ...input, resize: "none", fontSize: 15 }}
                />

                {error && (
                  <p style={{ margin: 0, fontSize: 12, color: "#ff6b6b" }}>{error}</p>
                )}

                <button type="submit" disabled={loading} style={{
                  padding: "15px",
                  background: loading ? "#0a0a1a" : "linear-gradient(135deg, #00F0FF28 0%, #F2B8B428 100%)",
                  border: `1px solid ${loading ? "#111" : "#00F0FF44"}`,
                  borderRadius: 12, color: loading ? "#444" : "#00F0FF",
                  fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
                }}>
                  {loading ? "Skickar..." : "✨ Anmäl mig till beta"}
                </button>

                <p style={{ margin: 0, fontSize: 11, color: "#2a2a3a", textAlign: "center" }}>
                  Ingen spam. Bara betainbjudan när det är dags.
                </p>
              </form>
            </>
          )}
        </div>

        {/* Features */}
        <div className="appear-3">
          <p style={{ fontSize: 11, color: "#333", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>
            Vad du får
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: "#070714", border: "1px solid #111128",
                borderRadius: 16, padding: "18px 20px",
                display: "flex", gap: 16, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#ddd" }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div style={{
          margin: "48px 0", padding: "24px",
          background: "#070714", border: "1px solid #111128",
          borderRadius: 16, textAlign: "center",
        }}>
          <p style={{ margin: "0 0 12px", fontSize: 15, color: "#888", fontStyle: "italic", lineHeight: 1.7 }}>
            "De flesta entreprenörer har för många idéer — inte för få. Problemet är att de flesta försvinner eller aldrig blir till handling."
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "#333", letterSpacing: 1 }}>
            CHRISTIAN WEDERBRAND · GRUNDARE, HACKADITTLIV
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 10, color: "#1a1a2e", letterSpacing: 1 }}>
          © 2026{" "}
          <a href="https://hackadittliv.se" target="_blank" rel="noopener noreferrer"
            style={{ color: "#F2B8B4", textDecoration: "none" }}>Hackadittliv</a>
          {" · "}Byggt av{" "}
          <a href="https://conversify.io" target="_blank" rel="noopener noreferrer"
            style={{ color: "#13c8ec", textDecoration: "none" }}>Conversify.io</a>
        </div>
      </div>
    </div>
  );
}
