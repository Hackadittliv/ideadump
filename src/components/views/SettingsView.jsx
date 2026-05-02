import { useState, useEffect } from "react";
import { exportToCSV } from "../../utils/export.js";
import { loadUserConfig, saveUserConfig, DEFAULT_BRANDS, DEFAULT_GOALS } from "../../utils/userConfig.js";
import { pushSupported, getPushStatus, subscribePush, unsubscribePush, sendTestPush } from "../../utils/push.js";
import { googleOAuthConfigured, openGoogleOAuthPopup, isGoogleCalendarConnected, disconnectGoogleCalendar } from "../../utils/googleCalendar.js";

export default function SettingsView({ ideas, onClearIdeas, flash, user, onSignOut }) {
  const initial = loadUserConfig();
  const [brands, setBrands] = useState(initial.brands);
  const [goals, setGoals] = useState(initial.goals);
  const [configSaved, setConfigSaved] = useState(false);
  const [pushState, setPushState] = useState("idle");
  const [pushWorking, setPushWorking] = useState(false);
  const [googleWorking, setGoogleWorking] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    if (!user) { setGoogleConnected(false); return; }
    isGoogleCalendarConnected(user.id).then(setGoogleConnected);
  }, [user]);

  const handleGoogleConnect = async () => {
    if (!user) { flash("Logga in först."); return; }
    setGoogleWorking(true);
    try {
      await openGoogleOAuthPopup(user.id);
      setGoogleConnected(true);
      flash("✨ Google Calendar kopplat!");
    } catch (e) {
      flash("Fel: " + e.message);
    } finally {
      setGoogleWorking(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!user) return;
    if (!confirm("Koppla bort Google Calendar?")) return;
    setGoogleWorking(true);
    try {
      await disconnectGoogleCalendar(user.id);
      setGoogleConnected(false);
      flash("Google Calendar bortkopplad.");
    } catch (e) {
      flash("Fel: " + e.message);
    } finally {
      setGoogleWorking(false);
    }
  };

  useEffect(() => {
    if (pushSupported()) getPushStatus().then(setPushState);
  }, []);

  const handleSubscribe = async () => {
    if (!user) { flash("Logga in först."); return; }
    setPushWorking(true);
    try {
      await subscribePush(user.id);
      setPushState("subscribed");
      flash("🔔 Notiser aktiverade!");
    } catch (e) {
      flash("Fel: " + e.message);
    } finally {
      setPushWorking(false);
    }
  };

  const handleUnsubscribe = async () => {
    setPushWorking(true);
    try {
      await unsubscribePush();
      setPushState("idle");
      flash("🔕 Notiser avaktiverade");
    } catch (e) {
      flash("Fel: " + e.message);
    } finally {
      setPushWorking(false);
    }
  };

  const handleTestPush = async () => {
    if (!user) return;
    setPushWorking(true);
    try {
      const result = await sendTestPush(user.id);
      flash(`📨 Skickade till ${result.sent} enhet(er)`);
    } catch (e) {
      flash("Fel: " + e.message);
    } finally {
      setPushWorking(false);
    }
  };

  const stats = [
    { icon: "💡", val: ideas.length, label: "Idéer", color: "#00F0FF" },
    { icon: "📥", val: ideas.filter(i => i.status === "inbox").length, label: "Inbox", color: "#00F0FF" },
    { icon: "🎯", val: ideas.filter(i => i.status === "next").length, label: "Next actions", color: "#F2B8B4" },
    { icon: "✅", val: ideas.filter(i => i.status === "done").length, label: "Klara", color: "#888" },
  ];

  const updateBrand = (i, field, value) => {
    setBrands(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));
    setConfigSaved(false);
  };

  const addBrand = () => {
    setBrands(prev => [...prev, { name: "Nytt varumärke", color: "#888888" }]);
    setConfigSaved(false);
  };

  const removeBrand = (i) => {
    setBrands(prev => prev.filter((_, idx) => idx !== i));
    setConfigSaved(false);
  };

  const saveConfig = () => {
    const cleaned = brands
      .map(b => ({ name: b.name.trim(), color: b.color }))
      .filter(b => b.name.length > 0);
    if (cleaned.length === 0) {
      flash("Minst ett varumärke krävs.");
      return;
    }
    saveUserConfig({ brands: cleaned, goals: goals.trim() });
    setBrands(cleaned);
    setConfigSaved(true);
    flash("✨ Konfiguration sparad. Reload för full effekt.");
    setTimeout(() => setConfigSaved(false), 2500);
  };

  const resetDefaults = () => {
    if (!window.confirm("Återställ varumärken och mål till standard?")) return;
    setBrands(DEFAULT_BRANDS);
    setGoals(DEFAULT_GOALS);
    saveUserConfig({ brands: DEFAULT_BRANDS, goals: DEFAULT_GOALS });
    flash("🔄 Återställt till standard.");
  };

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
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>{user.email}</p>
          </div>
          <button onClick={onSignOut} style={{
            background: "none", border: "1px solid #3a1a1a", borderRadius: 8,
            color: "#aa4444", fontSize: 12, padding: "11px 14px", minHeight: 44,
            cursor: "pointer",
          }}>Logga ut</button>
        </div>
      )}

      {/* Google Calendar-koppling */}
      {googleOAuthConfigured() && user && (
        <div style={{
          background: "#070714", border: "1px solid #4285f422",
          borderRadius: 12, padding: 14, marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "#6ba5f7", fontWeight: 600 }}>
            📅 Google Calendar
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "#888", lineHeight: 1.7 }}>
            Boka idéer direkt i din Google Calendar istället för att ladda ner .ics-filer.
          </p>
          {googleConnected ? (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{
                flex: 1, padding: "12px",
                background: "#34a85318", border: "1px solid #34a85344", borderRadius: 10,
                color: "#7dd38f", fontSize: 13, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>✅ Kopplad</div>
              <button onClick={handleGoogleDisconnect} disabled={googleWorking} style={{
                padding: "12px 16px",
                background: "transparent", border: "1px solid #3a1a1a", borderRadius: 10,
                color: "#aa4444", fontSize: 12, fontWeight: 600, cursor: googleWorking ? "default" : "pointer",
              }}>Koppla bort</button>
            </div>
          ) : (
            <button onClick={handleGoogleConnect} disabled={googleWorking} style={{
              width: "100%", padding: "12px",
              background: "linear-gradient(135deg, #4285f428 0%, #34a85328 100%)",
              border: "1px solid #4285f444", borderRadius: 10,
              color: "#6ba5f7", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              {googleWorking ? "⏳ Öppnar Google..." : "🔗 Koppla Google Calendar"}
            </button>
          )}
        </div>
      )}

      {/* Push-notiser */}
      {pushSupported() && user && (
        <div style={{
          background: "#070714", border: "1px solid #F2B8B418",
          borderRadius: 12, padding: 14, marginBottom: 16,
        }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "#F2B8B4", fontWeight: 600 }}>
            🔔 Push-notiser
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "#888", lineHeight: 1.7 }}>
            Få pushnotis när en deadline närmar sig eller passerat. Söndagsgenomgången skickas via mail.
          </p>
          {pushState === "denied" && (
            <p style={{ margin: 0, fontSize: 12, color: "#ff6644" }}>
              Notiser är blockerade i webbläsaren. Aktivera i webbläsarinställningarna.
            </p>
          )}
          {pushState !== "denied" && (
            <div style={{ display: "flex", gap: 8 }}>
              {pushState === "subscribed" ? (
                <>
                  <button onClick={handleTestPush} disabled={pushWorking} style={{
                    flex: 1, padding: "10px",
                    background: "#F2B8B418", border: "1px solid #F2B8B444",
                    borderRadius: 10, color: "#F2B8B4", fontSize: 12, cursor: "pointer",
                  }}>
                    📨 Skicka test
                  </button>
                  <button onClick={handleUnsubscribe} disabled={pushWorking} style={{
                    flex: 1, padding: "10px",
                    background: "transparent", border: "1px solid #3a1a1a",
                    borderRadius: 10, color: "#aa4444", fontSize: 12, cursor: "pointer",
                  }}>
                    🔕 Avaktivera
                  </button>
                </>
              ) : (
                <button onClick={handleSubscribe} disabled={pushWorking} style={{
                  flex: 1, padding: "12px",
                  background: "linear-gradient(135deg, #F2B8B428 0%, #00F0FF18 100%)",
                  border: "1px solid #F2B8B444", borderRadius: 10,
                  color: "#F2B8B4", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  {pushWorking ? "⏳ Aktiverar..." : "🔔 Aktivera push-notiser"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Varumärken */}
      <div style={{
        background: "#070714", border: "1px solid #00F0FF18",
        borderRadius: 12, padding: 14, marginBottom: 16,
      }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#00F0FF", fontWeight: 600 }}>
          🏷 Mina varumärken
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 11, color: "#888", lineHeight: 1.7 }}>
          Claude kopplar varje idé till ett av dessa varumärken. Redigera eller lägg till egna.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {brands.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="color"
                value={b.color}
                onChange={e => updateBrand(i, "color", e.target.value)}
                style={{
                  width: 38, height: 38, padding: 0, border: "1px solid #1e1e3a",
                  borderRadius: 8, cursor: "pointer", background: "transparent",
                }}
              />
              <input
                type="text"
                value={b.name}
                onChange={e => updateBrand(i, "name", e.target.value)}
                style={{
                  flex: 1, padding: "8px 12px", background: "#02020e",
                  border: "1px solid #1e1e3a", borderRadius: 8,
                  color: "#ccc", fontSize: 13, outline: "none",
                }}
              />
              <button onClick={() => removeBrand(i)} title="Ta bort"
                style={{
                  background: "transparent", border: "1px solid #3a1a1a",
                  borderRadius: 8, color: "#aa4444", fontSize: 14,
                  padding: "0", minWidth: 44, minHeight: 44, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>✕</button>
            </div>
          ))}
        </div>
        <button onClick={addBrand} style={{
          width: "100%", marginTop: 10, padding: "10px",
          background: "transparent", border: "1px dashed #00F0FF33",
          borderRadius: 8, color: "#00F0FF", fontSize: 12, cursor: "pointer",
        }}>
          + Lägg till varumärke
        </button>
      </div>

      {/* Mål + coaching-kontext */}
      <div style={{
        background: "#070714", border: "1px solid #F2B8B418",
        borderRadius: 12, padding: 14, marginBottom: 16,
      }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#F2B8B4", fontWeight: 600 }}>
          🎯 Mina mål
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 11, color: "#888", lineHeight: 1.7 }}>
          Claude filtrerar alla idéer mot dessa mål. Var konkret — mål som kan översättas till kassaflöde eller tydliga milstolpar ger bättre analyser.
        </p>
        <textarea
          value={goals}
          onChange={e => { setGoals(e.target.value); setConfigSaved(false); }}
          placeholder="T.ex. 'Bli skuldfri 2026 och öka kassaflödet via AI-tjänster, appar och föreläsningar.'"
          inputMode="text"
          style={{
            width: "100%", minHeight: 120, padding: "10px 12px",
            background: "#02020e", border: "1px solid #1e1e3a", borderRadius: 8,
            color: "#ccc", fontSize: 16, fontFamily: "inherit", outline: "none",
            lineHeight: 1.6, resize: "vertical", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Spara-knappar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <button onClick={saveConfig} style={{
          flex: 2, padding: "12px",
          background: configSaved ? "#00ff8818" : "linear-gradient(135deg, #00F0FF28 0%, #00c8d440 100%)",
          border: `1px solid ${configSaved ? "#00ff8844" : "#00F0FF55"}`,
          borderRadius: 10, color: configSaved ? "#00ff88" : "#00F0FF",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          {configSaved ? "✓ Sparat" : "💾 Spara konfiguration"}
        </button>
        <button onClick={resetDefaults} style={{
          flex: 1, padding: "12px", background: "transparent",
          border: "1px solid #1e1e3a", borderRadius: 10,
          color: "#888", fontSize: 12, cursor: "pointer",
        }}>
          🔄 Standard
        </button>
      </div>

      {/* API-info */}
      <div style={{
        background: "#070714", border: "1px solid #111128",
        borderRadius: 12, padding: 14, marginBottom: 22,
      }}>
        <p style={{ margin: "0 0 6px", fontSize: 11, color: "#888", fontWeight: 600 }}>
          🔒 API-nycklar är server-side
        </p>
        <p style={{ margin: "0 0 8px", fontSize: 11, color: "#666", lineHeight: 1.7 }}>
          Alla nycklar hanteras via Netlify Functions. Lägg till dem under <strong style={{ color: "#888" }}>Site configuration → Environment variables</strong> i Netlify-dashboarden.
        </p>
        <ul style={{ margin: "0 0 0 16px", padding: 0, fontSize: 10, color: "#666", lineHeight: 1.8 }}>
          <li><code style={{ color: "#888" }}>ANTHROPIC_API_KEY</code> — idé-analys + vision + research</li>
          <li><code style={{ color: "#888" }}>OPENAI_API_KEY</code> — Whisper-transkription (valfri)</li>
          <li><code style={{ color: "#888" }}>EXA_API_KEY</code> — semantic similarity</li>
          <li><code style={{ color: "#888" }}>PERPLEXITY_API_KEY</code> — marknads-Q&A</li>
        </ul>
      </div>

      {/* Statistik */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        {stats.map(({ icon, val, label, color }) => (
          <div key={label} style={{
            background: "#070714", border: "1px solid #111128",
            borderRadius: 14, padding: "16px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "DM Mono, monospace", marginTop: 4 }}>{val}</div>
            <div style={{ fontSize: 9, color: "#777", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{label}</div>
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
        <p style={{ margin: 0, fontSize: 11, color: "#777", lineHeight: 1.7 }}>
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
          border: "1px solid #3a1a1a", borderRadius: 12, padding: "11px 0",
          color: "#aa4444", fontSize: 13, cursor: "pointer",
        }}>
          🗑 Rensa alla idéer
        </button>
      )}
    </div>
  );
}
