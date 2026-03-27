// Landningssida — IdeaDump Beta (optimerad konvertering)
import { useState, useEffect } from "react";

const STEPS = [
  {
    num: "01",
    title: "Säg det till Siri",
    desc: "\"Hej Siri, dumpa en idé\" — appen öppnas och mikrofonen startar direkt. Inga knappar, ingen friktion.",
  },
  {
    num: "02",
    title: "Claude analyserar på sekunder",
    desc: "Din idé får ICE-score, pros & cons, den största risken och ett konkret nästa steg inom 48 timmar.",
  },
  {
    num: "03",
    title: "Du vet vad du ska göra",
    desc: "Söndagsgenomgången pekar ut veckans tre bästa idéer — du bokar in dem i kalendern med ett tryck.",
  },
];

const FEATURES = [
  {
    icon: "🎯",
    title: "Aldrig mer 'bra idé, men...'",
    desc: "Claude flaggar direkt om din idé är en distraction eller en riktig möjlighet — baserat på dina faktiska mål.",
  },
  {
    icon: "💰",
    title: "Fokus på kassaflöde",
    desc: "Varje analys kopplas till vad som faktiskt ger intäkt den här veckan — inte vad som känns kul att jobba med.",
  },
  {
    icon: "📅",
    title: "Idéer som faktiskt blir handling",
    desc: "Söndagsgenomgången väljer ut topp 3 och bokar in dem direkt i Apple Kalender. Ingenting ruttnar i inbox.",
  },
  {
    icon: "⚡",
    title: "30 sekunder från tanke till sparad",
    desc: "Siri-genväg → röstinspelning → Claude-analys → sparad. Hands-free, utan att ta upp telefonen.",
  },
];

export default function LandingView({ onShowLogin }) {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState("");
  const [count, setCount]     = useState(null);

  useEffect(() => {
    fetch("/.netlify/functions/get-beta-count")
      .then(r => r.json())
      .then(d => setCount(d.count))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/.netlify/functions/beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
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

  const inputStyle = {
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
        .s1 { animation: fade-up 0.5s ease both; }
        .s2 { animation: fade-up 0.5s 0.08s ease both; }
        .s3 { animation: fade-up 0.5s 0.16s ease both; }
        .s4 { animation: fade-up 0.5s 0.24s ease both; }
        * { -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: #2a2a3a; }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Nav */}
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{
              fontSize: 20, fontWeight: 700,
              background: "linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>IdeaDump</span>
            <span style={{ fontSize: 10, color: "#252535", letterSpacing: 2 }}>BETA</span>
          </div>
          <button onClick={onShowLogin} style={{
            background: "transparent", border: "1px solid #1a1a2e",
            borderRadius: 10, padding: "8px 16px", color: "#444",
            fontSize: 13, cursor: "pointer",
          }}>Logga in</button>
        </nav>

        {/* Hero */}
        <section className="s1" style={{ paddingTop: 40, paddingBottom: 52 }}>

          {/* Urgency-badge */}
          {count > 0 && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "#00F0FF10", border: "1px solid #00F0FF25",
              borderRadius: 20, padding: "6px 14px", marginBottom: 24,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00F0FF", flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#00F0FF" }}>
                {count} entreprenörer på väntelistan
              </span>
            </div>
          )}

          <h1 style={{
            fontSize: 38, fontWeight: 700, lineHeight: 1.15,
            letterSpacing: -1.5, margin: "0 0 20px",
          }}>
            Du har för många idéer.{" "}
            <span style={{
              background: "linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              De flesta försvinner.
            </span>
          </h1>

          <p style={{ fontSize: 17, color: "#555", lineHeight: 1.75, margin: "0 0 28px" }}>
            IdeaDump fångar idéer med rösten på 30 sekunder, låter Claude analysera dem direkt och visar dig varje vecka exakt vad du ska agera på — kopplat till dina faktiska mål.
          </p>

          {/* Inline mini-CTA i hero */}
          <button onClick={() => document.getElementById("signup-form").scrollIntoView({ behavior: "smooth" })}
            style={{
              padding: "14px 24px",
              background: "linear-gradient(135deg, #00F0FF22, #F2B8B418)",
              border: "1px solid #00F0FF33", borderRadius: 12,
              color: "#00F0FF", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
            Säkra min betaplats →
          </button>
        </section>

        {/* Hur det fungerar */}
        <section className="s2" style={{ marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: "#252535", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24 }}>
            Så här fungerar det
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ display: "flex", gap: 20, paddingBottom: i < STEPS.length - 1 ? 8 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: "#00F0FF14", border: "1px solid #00F0FF2a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#00F0FF", fontWeight: 700,
                  }}>{s.num}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 1, height: 32, background: "#111128", marginTop: 6 }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 16 : 0, paddingTop: 6 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#ddd" }}>{s.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="s3" style={{ marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: "#252535", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
            Vad du faktiskt får
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: "#070714", border: "1px solid #0e0e20",
                borderRadius: 16, padding: "18px 20px",
                display: "flex", gap: 16, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#ccc" }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Citat */}
        <section style={{
          background: "#070714", border: "1px solid #0e0e20",
          borderRadius: 16, padding: "24px", marginBottom: 48, textAlign: "center",
        }}>
          <p style={{ margin: "0 0 16px", fontSize: 15, color: "#666", fontStyle: "italic", lineHeight: 1.75 }}>
            "Problemet är aldrig att du har för få idéer. Problemet är att de försvinner — eller att du agerar på fel en."
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #00F0FF33, #F2B8B433)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#00F0FF",
            }}>C</div>
            <p style={{ margin: 0, fontSize: 11, color: "#252535", letterSpacing: 1 }}>
              CHRISTIAN WEDERBRAND · GRUNDARE, HACKADITTLIV
            </p>
          </div>
        </section>

        {/* Formulär */}
        <section id="signup-form" className="s4" style={{
          background: "linear-gradient(135deg, #0c0c1e 0%, #0f0f24 100%)",
          border: "1px solid #00F0FF28", borderRadius: 20,
          padding: "28px 24px", marginBottom: 48,
        }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Du är med på listan!</h2>
              <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: 0 }}>
                Kolla mejlen — ett bekräftelsemail är på väg.<br />
                Vi hör av oss när din plats är redo.
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
                Säkra din betaplats
              </h2>
              <p style={{ fontSize: 13, color: "#333", margin: "0 0 20px" }}>
                Gratis under beta. Inget kort krävs.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="email"
                  placeholder="din@epost.se"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={inputStyle}
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
                  transition: "all 0.2s",
                }}>
                  {loading ? "Skickar..." : "Säkra min betaplats →"}
                </button>

                <p style={{ margin: 0, fontSize: 11, color: "#1e1e2e", textAlign: "center", lineHeight: 1.7 }}>
                  Genom att anmäla dig godkänner du tips från{" "}
                  <a href="https://hackadittliv.se" target="_blank" rel="noopener noreferrer"
                    style={{ color: "#F2B8B4", textDecoration: "none" }}>Hackadittliv</a>.
                  {" "}Ingen spam.
                </p>
              </form>
            </>
          )}
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", fontSize: 10, color: "#151520", letterSpacing: 1 }}>
          En produkt från{" "}
          <a href="https://hackadittliv.se" target="_blank" rel="noopener noreferrer"
            style={{ color: "#F2B8B4", textDecoration: "none" }}>Hackadittliv</a>
          {" · "}Byggt av{" "}
          <a href="https://conversify.io" target="_blank" rel="noopener noreferrer"
            style={{ color: "#13c8ec", textDecoration: "none" }}>Conversify.io</a>
        </footer>

      </div>
    </div>
  );
}
