// Integritetspolicy — IdeaDump / Hackadittliv

export default function PrivacyView({ onClose }) {
  const section = (title, children) => (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#00F0FF", marginBottom: 10, letterSpacing: 0.5 }}>
        {title}
      </h2>
      {children}
    </div>
  );

  const p = (text) => (
    <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7, marginBottom: 8 }}>{text}</p>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(2,2,14,0.97)",
      overflowY: "auto", padding: "24px 20px 60px",
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Tillbaka-knapp */}
        <button onClick={onClose} className="btn-ghost" style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "1px solid #1a1a2e", borderRadius: 10,
          color: "#555", fontSize: 13, padding: "8px 14px", cursor: "pointer", marginBottom: 24,
        }}>
          ← Tillbaka
        </button>

        <h1 style={{
          fontSize: 22, fontWeight: 700, marginBottom: 4,
          background: "linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Integritetspolicy</h1>
        <p style={{ fontSize: 11, color: "#333", marginBottom: 28 }}>
          Senast uppdaterad: mars 2026
        </p>

        {section("1. Personuppgiftsansvarig",
          <>
            {p("Conversify.io är personuppgiftsansvarig för IdeaDump.")}
            <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7 }}>
              Kontakt: <a href="mailto:info@conversify.io" style={{ color: "#00F0FF" }}>info@conversify.io</a>
            </p>
          </>
        )}

        {section("2. Vilken data vi hanterar",
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Datatyp", "Syfte", "Lagring"].map(h => (
                  <th key={h} style={{ textAlign: "left", color: "#555", padding: "4px 8px 8px 0", borderBottom: "1px solid #111128" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Dina idéer & transkriberingar", "Idéhantering & AI-analys", "localStorage (din enhet)"],
                ["ICE-scores & AI-analys", "Prioritering av idéer", "localStorage (din enhet)"],
                ["API-nycklar (Anthropic/OpenAI)", "Autentisering mot AI-tjänster", "localStorage (din enhet)"],
                ["Röstinspelning (tillfällig)", "Transkribering via Whisper", "Skickas till OpenAI, lagras ej"],
                ["Idétext (vid analys)", "AI-analys via Claude", "Skickas till Anthropic, lagras ej"],
              ].map(([typ, syfte, lag], i) => (
                <tr key={i}>
                  <td style={{ padding: "8px 8px 8px 0", color: "#ccc", borderBottom: "1px solid #0a0a18" }}>{typ}</td>
                  <td style={{ padding: "8px 8px 8px 0", color: "#888", borderBottom: "1px solid #0a0a18" }}>{syfte}</td>
                  <td style={{ padding: "8px 0", color: "#666", borderBottom: "1px solid #0a0a18", fontSize: 11 }}>{lag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {section("3. Hur vi använder data",
          <ul style={{ paddingLeft: 16, listStyle: "none" }}>
            {[
              "Dina idéer sparas lokalt i din webbläsare — vi har ingen tillgång till dem.",
              "Vid AI-analys skickas idétexten till Anthropics API. Anthropic hanterar data enligt deras integritetspolicy.",
              "Vid Whisper-transkribering skickas ljudfilen till OpenAIs API. OpenAI hanterar data enligt deras policy.",
              "Vi säljer, delar eller analyserar inte din data.",
              "Ingen server hos oss lagrar dina idéer eller API-nycklar.",
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7, marginBottom: 6, paddingLeft: 16, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "#00F0FF" }}>·</span>
                {item}
              </li>
            ))}
          </ul>
        )}

        {section("4. Tredjepartstjänster",
          <>
            {p("IdeaDump använder följande externa tjänster:")}
            <ul style={{ paddingLeft: 16, listStyle: "none" }}>
              {[
                ["Anthropic Claude API", "AI-analys av idéer", "anthropic.com/privacy"],
                ["OpenAI Whisper API", "Rösttranskribering (valfritt)", "openai.com/policies/privacy-policy"],
                ["Netlify", "Hosting av appen", "netlify.com/privacy"],
              ].map(([namn, syfte, url], i) => (
                <li key={i} style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>
                  <strong style={{ color: "#ddd" }}>{namn}</strong> — {syfte}
                  <br />
                  <a href={`https://${url}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "#555" }}>{url}</a>
                </li>
              ))}
            </ul>
          </>
        )}

        {section("5. Dina rättigheter",
          <ul style={{ paddingLeft: 16, listStyle: "none" }}>
            {[
              "Tillgång — All din data finns i din webbläsares localStorage. Du kan exportera den via CSV-export i Inställningar.",
              "Radering — Rensa all data via Inställningar → Rensa alla idéer, eller rensa localStorage i webbläsaren.",
              "Portabilitet — Exportera alla idéer som CSV-fil när som helst.",
              "Invändning — Välj att inte använda AI-analys. Idéer kan sparas utan att skickas till Anthropic.",
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: "#aaa", lineHeight: 1.7, marginBottom: 8, paddingLeft: 16, position: "relative" }}>
                <span style={{ position: "absolute", left: 0, color: "#00F0FF" }}>·</span>
                {item}
              </li>
            ))}
          </ul>
        )}

        {section("6. Cookies & Analytics",
          p("IdeaDump använder inga cookies och ingen spårning. Appen är helt cookiefri.")
        )}

        {section("7. Lagring & Säkerhet",
          <>
            {p("All data lagras i din egen webbläsare (localStorage). Inga personuppgifter lagras på våra servrar. Kommunikation med Anthropic och OpenAI sker krypterat via HTTPS.")}
            {p("Netlify (hosting) är certifierat enligt SOC 2 Type II och GDPR-compliant.")}
          </>
        )}

        {section("8. Kontakt",
          <>
            {p("Frågor om denna policy eller dina rättigheter skickas till:")}
            <p style={{ fontSize: 13, color: "#aaa" }}>
              <a href="mailto:info@conversify.io" style={{ color: "#00F0FF" }}>info@conversify.io</a>
              <br />
              Conversify.io, Sverige
            </p>
          </>
        )}

        <button onClick={onClose} style={{
          width: "100%", padding: "14px", marginTop: 16,
          background: "linear-gradient(135deg, #00F0FF18 0%, #F2B8B418 100%)",
          border: "1px solid #00F0FF28", borderRadius: 12,
          color: "#e0e0e0", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          Stäng
        </button>
      </div>
    </div>
  );
}
