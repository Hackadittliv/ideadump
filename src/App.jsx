import { useState, useEffect, useRef, useCallback } from "react";
import CaptureView from "./components/views/CaptureView.jsx";
import ListView from "./components/views/ListView.jsx";
import SettingsView from "./components/views/SettingsView.jsx";
import PrivacyView from "./components/views/PrivacyView.jsx";
import LoginView from "./components/views/LoginView.jsx";
import WeeklyReviewView from "./components/views/WeeklyReviewView.jsx";
import LandingView from "./components/views/LandingView.jsx";
import BottomNav from "./components/ui/BottomNav.jsx";
import { useAuth } from "./utils/useAuth.js";
import { saveToCloud, loadFromCloud } from "./utils/cloudSync.js";
import { loadIdeas, saveIdeas, loadApiKeys } from "./utils/storage.js";
import { analyzeIdea } from "./utils/claudeApi.js";
import { authedFetch } from "./utils/authedFetch.js";

export default function IdeaDump() {
  const { user, loading: authLoading, betaApproved, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView]               = useState("capture");
  const [ideas, setIdeas]             = useState([]);
  const [transcript, setTranscript]   = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedId, setExpandedId]   = useState(null);
  const [filterBrand, setFilterBrand]   = useState("Alla");
  const [filterStatus, setFilterStatus] = useState("Alla");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey]       = useState("");
  const [voiceMode, setVoiceMode]     = useState("browser");
  const [statusMsg, setStatusMsg]     = useState("");

  const [showPrivacy, setShowPrivacy] = useState(false);

  const recRef          = useRef(null);
  const mediaRef        = useRef(null);
  const wakeLockRef     = useRef(null);
  const chunksRef       = useRef([]);
  const autoModeRef     = useRef(false);   // hands-free läge aktivt?
  const transcriptRef   = useRef("");      // synkron kopia av transcript
  const ideasRef        = useRef([]);      // synkron kopia av ideas (undviker stale closure)

  // ── Håll refs synkade ──
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { ideasRef.current = ideas; }, [ideas]);

  // ── Ladda API-nycklar ──
  useEffect(() => {
    const keys = loadApiKeys();
    setAnthropicKey(keys.anthropic);
    setOpenaiKey(keys.openai);
  }, []);

  // Autorecord: vänta tills användaren är inloggad och beta-godkänd
  const autorecordPending = useRef(
    new URLSearchParams(window.location.search).get("autorecord") === "true"
  );
  useEffect(() => {
    if (!user || !betaApproved || authLoading || !autorecordPending.current) return;
    autorecordPending.current = false;
    autoModeRef.current = true;
    setTimeout(() => startBrowserSpeech(), 900);
  }, [user, betaApproved, authLoading]);

  // ── Ladda idéer: cloud om inloggad, annars localStorage ──
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      loadFromCloud(user.id)
        .then(cloudIdeas => {
          if (cloudIdeas && cloudIdeas.length > 0) {
            setIdeas(cloudIdeas);
          } else {
            // Migrera localStorage-idéer till cloud vid första inloggning
            const local = loadIdeas();
            setIdeas(local);
            if (local.length > 0) {
              saveToCloud(user.id, local).catch(err => {
                console.error("[CloudSync] migration save failed:", err);
                flash("Kunde inte synka idéer till molnet. De finns lokalt — försök igen senare.");
              });
            }
          }
        })
        .catch(err => {
          console.error("[CloudSync] load failed:", err);
          flash("Kunde inte hämta idéer från molnet. Visar lokal kopia — undvik att redigera tills sync funkar igen.", 6000);
          setIdeas(loadIdeas());
        });
    } else {
      setIdeas(loadIdeas());
    }
  }, [user, authLoading]);

  const flash = useCallback((msg, ms = 3000) => {
    setStatusMsg(msg);
    if (ms < 99999) setTimeout(() => setStatusMsg(""), ms);
  }, []);

  const persistIdeas = useCallback((arr) => {
    setIdeas(arr);
    saveIdeas(arr); // alltid spara lokalt
    if (user) {
      saveToCloud(user.id, arr).catch(err => {
        console.error("[CloudSync] save failed:", err);
        flash("⚠️ Sparat lokalt men synk till molnet misslyckades. Logga in igen om felet fortsätter.", 5000);
      });
    }
  }, [user, flash]);

  // ── Browser Speech API ──
  const startBrowserSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { flash("Web Speech stöds ej i denna webbläsare."); return; }
    const rec = new SR();
    rec.lang = "sv-SE"; rec.continuous = true; rec.interimResults = true;
    let final = "";
    rec.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        else interim = e.results[i][0].transcript;
      }
      const text = final + interim;
      setTranscript(text);
      transcriptRef.current = text;
    };
    rec.onend = () => {
      setIsRecording(false);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      // Hands-free: analysera automatiskt när inspelningen stannar
      if (autoModeRef.current && transcriptRef.current.trim()) {
        autoModeRef.current = false;
        handleAnalyzeRef.current(transcriptRef.current);
      }
    };
    rec.onerror = e => { flash("Mikrofon-fel: " + e.error); setIsRecording(false); };
    rec.start();
    recRef.current = rec;
    setIsRecording(true);
    navigator.wakeLock?.request("screen").then(wl => { wakeLockRef.current = wl; }).catch(() => {});
    setTranscript("");
    transcriptRef.current = "";
  };

  const stopBrowserSpeech = () => {
    recRef.current?.stop();
    setIsRecording(false);
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  };

  // ── Whisper ──
  const startWhisper = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await transcribeWhisper(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      mr.start();
      mediaRef.current = mr;
      setIsRecording(true);
      setTranscript("");
      flash("🔴 Spelar in med Whisper...", 99999);
    } catch {
      flash("Mikrofonåtkomst nekad");
    }
  };

  const stopWhisper = () => {
    mediaRef.current?.stop();
    setIsRecording(false);
    flash("Transkriberar med Whisper...", 99999);
  };

  const transcribeWhisper = async (blob) => {
    try {
      // Konvertera blob till base64 för att skicka via Netlify Function
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const res = await authedFetch("/.netlify/functions/whisper-transcribe", {
        method: "POST",
        body: JSON.stringify({ audio: base64, mimeType: blob.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setTranscript(data.text || "");
      flash("Transkribering klar!");
    } catch (e) {
      flash("Whisper-fel: " + e.message);
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      voiceMode === "browser" ? stopBrowserSpeech() : stopWhisper();
    } else {
      voiceMode === "browser" ? startBrowserSpeech() : startWhisper();
    }
  };

  // ── Bildanalys: skicka bild till Claude Vision, få tillbaka idé som text ──
  const handleImageAnalyze = useCallback(async ({ base64, mediaType, note }) => {
    flash("Claude läser bilden...", 99999);
    try {
      const res = await authedFetch("/.netlify/functions/claude-vision", {
        method: "POST",
        body: JSON.stringify({ imageBase64: base64, mediaType, note: note?.trim() || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const text = data.text || "";
      setTranscript(text);
      transcriptRef.current = text;
      flash("Bild läst — tryck Analysera för full ICE-analys.", 4000);
    } catch (e) {
      flash("Vision-fel: " + e.message);
    }
  }, [flash]);

  // ── Claude-analys (tar valfri text — används av både knapp och hands-free) ──
  const handleAnalyze = useCallback(async (textOverride) => {
    const text = (typeof textOverride === "string" ? textOverride : transcript).trim();
    if (!text) return;
    setIsAnalyzing(true);
    flash("Claude analyserar din idé...", 99999);
    try {
      const ai = await analyzeIdea(text);
      const newIdea = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        transcript: text,
        brand: ai.suggestedBrand || "Övrigt",
        aiAnalysis: ai,
        manualScores: null,
        status: "inbox",
        notes: "",
      };
      persistIdeas([newIdea, ...ideasRef.current]);
      setTranscript("");
      transcriptRef.current = "";
      setStatusMsg("");
      flash("✨ Analyserad och sparad!");
      setTimeout(() => { setView("list"); setExpandedId(newIdea.id); }, 700);
    } catch (e) {
      flash("Fel: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [transcript, persistIdeas, flash]);

  // Ref för att anropas inifrån event-handlers utan stale closure
  const handleAnalyzeRef = useRef(handleAnalyze);
  useEffect(() => { handleAnalyzeRef.current = handleAnalyze; }, [handleAnalyze]);

  const handleSaveRaw = () => {
    if (!transcript.trim()) return;
    const newIdea = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      transcript: transcript.trim(),
      brand: "Övrigt",
      aiAnalysis: null,
      manualScores: null,
      status: "inbox",
      notes: "",
    };
    persistIdeas([newIdea, ...ideas]);
    setTranscript("");
    flash("Sparad utan analys");
  };

  const inboxCount = ideas.filter(i => i.status === "inbox").length;

  // Auth-laddning
  if (authLoading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#02020e", color: "#666", fontSize: 13, letterSpacing: 2,
    }}>LADDAR...</div>
  );

  // Integritetspolicy — tillgänglig även utan inloggning
  if (showPrivacy) return <PrivacyView onClose={() => setShowPrivacy(false)} />;

  // Visa login-modal eller landningssida om ej inloggad
  // Om autorecord=true i URL (t.ex. från Siri-genväg) → visa login direkt
  // Om login=1 i URL (t.ex. från "öppna i Safari"-länken) → visa login direkt
  const urlParams = new URLSearchParams(window.location.search);
  const autoRecordParam = urlParams.get("autorecord") === "true";
  const loginParam = urlParams.get("login") === "1";
  if (!user) {
    if (showLogin || autoRecordParam || loginParam) return (
      <LoginView
        onSignInGoogle={signInWithGoogle}
        onSignInEmail={signInWithEmail}
        onSignUpEmail={signUpWithEmail}
        onBack={() => setShowLogin(false)}
      />
    );
    return <LandingView
      onShowLogin={() => setShowLogin(true)}
      onShowPrivacy={() => setShowPrivacy(true)}
    />;
  }

  // Inloggad men ej godkänd — personligt verktyg, ej öppet
  if (!betaApproved) return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#02020e", color: "#e0e0e0", padding: "40px 20px",
      fontFamily: "'DM Sans', sans-serif", textAlign: "center",
    }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>Personligt verktyg</h2>
      <p style={{ fontSize: 14, color: "#aaa", lineHeight: 1.7, maxWidth: 380, margin: "0 auto 20px" }}>
        IdeaDump är Christian Wederbrands personliga produktivitetssystem och är inte öppet för andra användare.
      </p>
      <p style={{ fontSize: 13, color: "#888", lineHeight: 1.7, maxWidth: 380, margin: "0 auto 28px" }}>
        Vill du ha ett liknande AI-verktyg byggt för din verksamhet?
        <br />
        <a href="https://conversify.io" target="_blank" rel="noopener noreferrer"
          style={{ color: "#13c8ec", textDecoration: "none", fontWeight: 600 }}>
          Kontakta Conversify →
        </a>
      </p>
      <button onClick={signOut} style={{
        background: "transparent", border: "1px solid #1a1a2e",
        borderRadius: 10, padding: "10px 20px", color: "#888",
        fontSize: 13, cursor: "pointer",
      }}>Logga ut</button>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 0%, #060618 0%, #02020e 100%)",
      color: "#e0e0e0",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      maxWidth: 500, margin: "0 auto",
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))",
    }}>
      <style>{`
        @keyframes rec-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,40,80,0.6); }
          50%      { box-shadow: 0 0 0 20px rgba(255,40,80,0); }
        }
        @keyframes idle-glow {
          0%,100% { box-shadow: 0 0 18px rgba(0,240,255,0.08); }
          50%      { box-shadow: 0 0 32px rgba(0,240,255,0.2); }
        }
        @keyframes fade-up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        .appear { animation: fade-up 0.3s ease both; }
        input[type=range] { -webkit-appearance: none; appearance: none; background: #1a1a30; border-radius: 4px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width:14px; height:14px; border-radius:50%; cursor:pointer; }
        ::-webkit-scrollbar { width:0; height:0; }
        * { -webkit-tap-highlight-color: transparent; }
        .nav-btn:hover { background: linear-gradient(135deg, #00F0FF12 0%, #F2B8B412 100%) !important; color: #999 !important; }
        .btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #00F0FF38 0%, #00c8d455 100%) !important; border-color: #00F0FF88 !important; }
        .btn-ghost:hover:not(:disabled) { border-color: #333 !important; color: #666 !important; }
        .btn-danger:hover { border-color: #3a1a1a !important; color: #663333 !important; }
        .pill:hover { opacity: 0.85; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ padding: "22px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -0.8,
              background: "linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>IdeaDump</h1>
            <span style={{ fontSize: 10, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>by HDL</span>
          </div>
          <p style={{ margin: 0, fontSize: 10, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>
            Capture · Analyze · Act
          </p>
        </div>
      </div>

      {/* STATUSMEDDELANDE */}
      {statusMsg && (
        <div className="appear" style={{
          margin: "12px 20px 0", background: "#00F0FF0d",
          border: "1px solid #00F0FF28", borderRadius: 10, padding: "9px 14px",
          fontSize: 13, color: "#00F0FF", textAlign: "center",
        }}>
          {statusMsg}
        </div>
      )}

      {/* VYER */}
      {view === "capture" && (
        <CaptureView
          transcript={transcript}
          setTranscript={setTranscript}
          isRecording={isRecording}
          isAnalyzing={isAnalyzing}
          voiceMode={voiceMode}
          setVoiceMode={setVoiceMode}
          onToggleRecord={handleToggleRecord}
          onAnalyze={handleAnalyze}
          onSaveRaw={handleSaveRaw}
          onImageAnalyze={handleImageAnalyze}
        />
      )}

      {view === "list" && (
        <ListView
          ideas={ideas}
          user={user}
          onUpdateIdea={updated => persistIdeas(ideas.map(i => i.id === updated.id ? updated : i))}
          onDeleteIdea={id => persistIdeas(ideas.filter(i => i.id !== id))}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          filterBrand={filterBrand}
          setFilterBrand={setFilterBrand}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onGoCapture={() => setView("capture")}
        />
      )}

      {view === "weekly" && (
        <WeeklyReviewView
          ideas={ideas}
          onUpdateIdea={updated => persistIdeas(ideas.map(i => i.id === updated.id ? updated : i))}
        />
      )}

      {view === "settings" && (
        <SettingsView
          ideas={ideas}
          onClearIdeas={() => persistIdeas([])}
          flash={flash}
          user={user}
          onSignOut={signOut}
        />
      )}

      {/* BRANDING FOOTER */}
      <div style={{
        margin: "0 20px", padding: "20px 0",
        borderTop: "1px solid #0e0e1e",
        display: "flex", justifyContent: "center", gap: 6,
        fontSize: 10, color: "#555", letterSpacing: 1,
      }}>
        <span>En produkt från</span>
        <a href="https://hackadittliv.se" target="_blank" rel="noopener noreferrer"
          style={{ color: "#F2B8B4", textDecoration: "none" }}>Hackadittliv</a>
        <span>·</span>
        <span>Byggt av</span>
        <a href="https://conversify.io" target="_blank" rel="noopener noreferrer"
          style={{ color: "#13c8ec", textDecoration: "none" }}>Conversify.io</a>
        <span>·</span>
        <button onClick={() => setShowPrivacy(true)} style={{
          background: "none", border: "none", padding: 0,
          color: "#666", fontSize: 10, letterSpacing: 1, cursor: "pointer",
        }}>Integritetspolicy</button>
      </div>

      <BottomNav view={view} onNav={setView} inboxCount={inboxCount} />
    </div>
  );
}
