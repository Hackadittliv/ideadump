import { exportToCSV } from "../../utils/export.js";

export default function SettingsView({ ideas, onClearIdeas, flash, user, onSignOut }) {
  const stats = [
    { icon: "💡", val: ideas.length, label: "Idéer", color: "#00F0FF" },
    { icon: "📥", val: ideas.filter(i => i.status === "inbox").length, label: "Inbox", color: "#00F0FF" },
    { icon: "🎯", val: ideas.filter(i => i.status === "next").length, label: "Next actions", color: "#F2B8B4" },
    { icon: "✅", val: ideas.filter(i => i.status === "done").length, label: "Klara", color: "#888" },
  ];

  return (
    <div style={{ padding: "24px 20px" }} className="appear">
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#00F0FF", margin: "0 0 22px" }}>
        Inställningar
      </h2>

      {/* Inloggad som */}
      {user && (
        <div style={{
          background: "#070714", border: "1px solid #00F0FF18",
          borderRadius: 12, padding: "12px 14px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#00F0FF", fontWeight: 600 }}>☁️ Inloggad</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#444" }}>{user.email}</p>
          </div>
          <button onClick={onSignOut} style={{
            background: "none", border: "1px solid #1e0e0e", borderRadius: 8,
            color: "#3a1a1a", fontSize: 11, padding: "6px 12px", cursor: "pointer",
          }}>Logga ut</button>
        </div>
      )}

      {/* API-info */}
      <div style={{
        background: "#070714", border: "1px solid #00F0FF18",
        borderRadius: 12, padding: 14, marginBottom: 22,
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, color: "#00F0FF", fontWeight: 600 }}>
          🔒 API-nycklar är server-side
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "#444", lineHeight: 1.7 }}>
          Anthropic- och OpenAI-nycklar hanteras säkert via Netlify Functions och exponeras aldrig i webbläsaren.
          Lägg till dem under <strong style={{ color: "#666" }}>Site configuration → Environment variables</strong> i Netlify-dashboarden.
        </p>
      </div>

      {/* Statistik */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 28 }}>
        {stats.map(({ icon, val, label, color }) => (
          <div key={label} style={{
            background: "#070714", border: "1px solid #111128",
            borderRadius: 14, padding: "16px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "DM Mono, monospace", marginTop: 4 }}>{val}</div>
            <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* CSV-export */}
      {ideas.length > 0 && (
        <button onClick={() => { exportToCSV(ideas); flash("📥 Exporterar CSV..."); }} style={{
          width: "100%", marginTop: 16, background: "#00F0FF0a",
          border: "1px solid #00F0FF28", borderRadius: 12, padding: "11px 0",
          color: "#00F0FF", fontSize: 13, cursor: "pointer",
        }}>
          📥 Exportera till CSV
        </button>
      )}

      {/* Säkerhetsinfo */}
      <div style={{
        marginTop: 16, background: "#070714", border: "1px solid #111128",
        borderRadius: 12, padding: 14,
      }}>
        <p style={{ margin: 0, fontSize: 11, color: "#333", lineHeight: 1.7 }}>
          ☁️ Idéer synkas till Supabase-molnet när du är inloggad — tillgängliga på alla enheter.
        </p>
      </div>

      {/* Rensa allt */}
      {ideas.length > 0 && (
        <button onClick={() => {
          if (window.confirm("Radera alla idéer? Det går inte att ångra.")) {
            onClearIdeas();
            flash("Alla idéer raderade");
          }
        }} className="btn-danger" style={{
          width: "100%", marginTop: 10, background: "transparent",
          border: "1px solid #1e0e0e", borderRadius: 12, padding: "11px 0",
          color: "#3a1a1a", fontSize: 13, cursor: "pointer",
        }}>
          🗑 Rensa alla idéer
        </button>
      )}
    </div>
  );
}
