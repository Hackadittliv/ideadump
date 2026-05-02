// Landningssida — IdeaDump (personligt verktyg från HDL)

const STEPS = [
  {
    num: "01",
    title: "Säg det till Siri",
    desc: "\"Hej Siri, dumpa en idé\". Appen öppnas och mikrofonen startar direkt. Inga knappar, ingen friktion.",
  },
  {
    num: "02",
    title: "Claude analyserar på sekunder",
    desc: "Idén får ICE-score, pros & cons, den största risken och ett konkret nästa steg inom 48 timmar.",
  },
  {
    num: "03",
    title: "Jag vet vad jag ska göra",
    desc: "Söndagsgenomgången pekar ut veckans tre bästa idéer. De bokas in i kalendern med ett tryck.",
  },
];

const FEATURES = [
  {
    icon: "🎯",
    title: "Aldrig mer 'bra idé, men...'",
    desc: "Claude flaggar direkt om idén är en distraction eller en riktig möjlighet, kopplat till mina faktiska mål.",
  },
  {
    icon: "💰",
    title: "Fokus på kassaflöde",
    desc: "Varje analys kopplas till vad som faktiskt ger intäkt den här veckan, inte vad som känns kul att jobba med.",
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

export default function LandingView({ onShowLogin, onShowPrivacy }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 0%, #060618 0%, #02020e 100%)",
      color: "#e0e0e0",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      <style>{`
        @keyframes fade-up { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        .s1 { animation: fade-up 0.5s ease both; }
        .s2 { animation: fade-up 0.5s 0.08s ease both; }
        .s3 { animation: fade-up 0.5s 0.16s ease both; }
        .s4 { animation: fade-up 0.5s 0.24s ease both; }
        * { -webkit-tap-highlight-color: transparent; }
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
            <span style={{ fontSize: 10, color: "#666", letterSpacing: 2 }}>HDL LABS</span>
          </div>
          <button onClick={onShowLogin} style={{
            background: "transparent", border: "1px solid #1a1a2e",
            borderRadius: 10, padding: "8px 16px", color: "#888",
            fontSize: 13, cursor: "pointer",
          }}>Logga in</button>
        </nav>

        {/* Hero */}
        <section className="s1" style={{ paddingTop: 40, paddingBottom: 52 }}>

          {/* Label */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#00F0FF10", border: "1px solid #00F0FF25",
            borderRadius: 20, padding: "6px 14px", marginBottom: 24,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00F0FF", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#00F0FF" }}>
              Bakom kulisserna på HDL
            </span>
          </div>

          <h1 style={{
            fontSize: 38, fontWeight: 700, lineHeight: 1.15,
            letterSpacing: -1.5, margin: "0 0 20px",
          }}>
            Jag har för många idéer.{" "}
            <span style={{
              background: "linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Så jag byggde ett system.
            </span>
          </h1>

          <p style={{ fontSize: 17, color: "#aaa", lineHeight: 1.75, margin: "0 0 28px" }}>
            IdeaDump är mitt personliga verktyg för att fånga idéer med rösten, låta Claude analysera dem direkt, och varje vecka veta exakt vilka tre jag ska agera på. Kopplat till mina faktiska mål — inte vad som känns kul att jobba med.
          </p>

          <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: "0 0 28px" }}>
            Det här är inte en produkt till salu. Det är en titt bakom kulisserna på hur jag jobbar — och ett exempel på vilken typ av AI-verktyg vi bygger på Conversify.
          </p>

          {/* Primär CTA */}
          <button onClick={onShowLogin} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "14px 22px", minHeight: 48,
            background: "linear-gradient(135deg, #00F0FF28 0%, #00c8d440 100%)",
            border: "1px solid #00F0FF55", borderRadius: 12,
            color: "#00F0FF", fontSize: 15, fontWeight: 700,
            cursor: "pointer",
          }}>
            Logga in med Google →
          </button>
        </section>

        {/* Hur det fungerar */}
        <section className="s2" style={{ marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24 }}>
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
                    <div style={{ width: 1, height: 32, background: "#222240", marginTop: 6 }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < STEPS.length - 1 ? 16 : 0, paddingTop: 6 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#ddd" }}>{s.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#888", lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="s3" style={{ marginBottom: 56 }}>
          <p style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
            Vad systemet gör
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{
                background: "#070714", border: "1px solid #1a1a2e",
                borderRadius: 16, padding: "18px 20px",
                display: "flex", gap: 16, alignItems: "flex-start",
              }}>
                <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#ddd" }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#888", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Citat */}
        <section style={{
          background: "#070714", border: "1px solid #1a1a2e",
          borderRadius: 16, padding: "24px", marginBottom: 48, textAlign: "center",
        }}>
          <p style={{ margin: "0 0 16px", fontSize: 15, color: "#aaa", fontStyle: "italic", lineHeight: 1.75 }}>
            "Problemet är aldrig att jag har för få idéer. Problemet är att de försvinner, eller att jag agerar på fel en."
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, #00F0FF33, #F2B8B433)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#00F0FF",
            }}>C</div>
            <p style={{ margin: 0, fontSize: 11, color: "#888", letterSpacing: 1 }}>
              CHRISTIAN WEDERBRAND · GRUNDARE, HACKADITTLIV
            </p>
          </div>
        </section>

        {/* Conversify CTA */}
        <section className="s4" style={{
          background: "linear-gradient(135deg, #0c0c1e 0%, #0f0f24 100%)",
          border: "1px solid #13c8ec33", borderRadius: 20,
          padding: "28px 24px", marginBottom: 48,
        }}>
          <p style={{ fontSize: 11, color: "#13c8ec", letterSpacing: 2, textTransform: "uppercase", margin: "0 0 12px", fontWeight: 700 }}>
            Byggt av Conversify
          </p>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.3 }}>
            Vill du också bygga ett AI-verktyg för din verksamhet?
          </h2>
          <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.7, margin: "0 0 20px" }}>
            IdeaDump är ett exempel på vad vi bygger på Conversify. Vi skapar skräddarsydda AI-verktyg åt företag och entreprenörer som vill jobba smartare, inte hårdare.
          </p>
          <a href="https://conversify.io" target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "14px 24px",
              background: "linear-gradient(135deg, #13c8ec28 0%, #00F0FF18 100%)",
              border: "1px solid #13c8ec44", borderRadius: 12,
              color: "#13c8ec", fontSize: 14, fontWeight: 700,
              textDecoration: "none",
            }}>
            Utforska Conversify →
          </a>
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", fontSize: 10, color: "#555", letterSpacing: 1 }}>
          En produkt från{" "}
          <a href="https://hackadittliv.se" target="_blank" rel="noopener noreferrer"
            style={{ color: "#F2B8B4", textDecoration: "none" }}>Hackadittliv</a>
          {" · "}Byggt av{" "}
          <a href="https://conversify.io" target="_blank" rel="noopener noreferrer"
            style={{ color: "#13c8ec", textDecoration: "none" }}>Conversify.io</a>
          {" · "}
          <button onClick={onShowPrivacy} style={{
            background: "none", border: "none", padding: 0,
            color: "#555", fontSize: 10, letterSpacing: 1, cursor: "pointer",
          }}>Integritetspolicy</button>
        </footer>

      </div>
    </div>
  );
}
