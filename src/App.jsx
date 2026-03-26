import { useState, useEffect, useRef, useCallback } from "react";
import CaptureView from "./components/views/CaptureView.jsx";
import ListView from "./components/views/ListView.jsx";
import SettingsView from "./components/views/SettingsView.jsx";
import PrivacyView from "./components/views/PrivacyView.jsx";
import { loadIdeas, saveIdeas, loadApiKeys } from "./utils/storage.js";
import { analyzeIdea } from "./utils/claudeApi.js";

export default function IdeaDump() {
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

  const recRef    = useRef(null);
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);

  // ── Ladda från localStorage ──
  useEffect(() => {
    setIdeas(loadIdeas());
    const keys = loadApiKeys();
    setAnthropicKey(keys.anthropic);
    setOpenaiKey(keys.openai);

    // Starta inspelning automatiskt om appen öppnades via Siri-genväg
    const params = new URLSearchParams(window.location.search);
    if (params.get("autorecord") === "true") {
      setTimeout(() => startBrowserSpeech(), 900);
    }
  }, []);

  const persistIdeas = useCallback((arr) => {
    setIdeas(arr);
    saveIdeas(arr);
  }, []);

  const flash = useCallback((msg, ms = 3000) => {
    setStatusMsg(msg);
    if (ms < 99999) setTimeout(() => setStatusMsg(""), ms);
  }, []);

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
      setTranscript(final + interim);
    };
    rec.onend = () => setIsRecording(false);
    rec.onerror = e => { flash("Mikrofon-fel: " + e.error); setIsRecording(false); };
    rec.start();
    recRef.current = rec;
    setIsRecording(true);
    setTranscript("");
  };

  const stopBrowserSpeech = () => { recRef.current?.stop(); setIsRecording(false); };

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
      const res = await fetch("/.netlify/functions/whisper-transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // ── Claude-analys ──
  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    flash("Claude analyserar din idé...", 99999);
    try {
      const ai = await analyzeIdea(transcript);
      const newIdea = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        transcript: transcript.trim(),
        brand: ai.suggestedBrand || "Övrigt",
        aiAnalysis: ai,
        manualScores: null,
        status: "inbox",
        notes: "",
      };
      persistIdeas([newIdea, ...ideas]);
      setTranscript("");
      setStatusMsg("");
      flash("✨ Analyserad och sparad!");
      setTimeout(() => { setView("list"); setExpandedId(newIdea.id); }, 700);
    } catch (e) {
      flash("Fel: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

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

  if (showPrivacy) return <PrivacyView onClose={() => setShowPrivacy(false)} />;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 30% 0%, #060618 0%, #02020e 100%)",
      color: "#e0e0e0",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      maxWidth: 500, margin: "0 auto",
      paddingBottom: 90,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');
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
            <span style={{ fontSize: 10, color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>by HDL</span>
          </div>
          <p style={{ margin: 0, fontSize: 10, color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>
            Capture · Analyze · Act
          </p>
        </div>
        {inboxCount > 0 && (
          <div style={{
            background: "#00F0FF18", border: "1px solid #00F0FF33",
            borderRadius: 20, padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00F0FF" }} />
            <span style={{ fontSize: 12, color: "#00F0FF", fontWeight: 600 }}>{inboxCount} inbox</span>
          </div>
        )}
      </div>

      {/* NAV */}
      <div style={{
        display: "flex", margin: "16px 20px 0", background: "#070714",
        borderRadius: 14, padding: 4, gap: 3, border: "1px solid #111128",
      }}>
        {[
          { key: "capture", label: "🎙 Capture" },
          { key: "list",    label: `📋 Idéer${ideas.length ? ` (${ideas.length})` : ""}` },
          { key: "settings", label: "⚙️" },
        ].map(n => (
          <button key={n.key} onClick={() => setView(n.key)} className="nav-btn" style={{
            flex: n.key === "settings" ? "0 0 44px" : 1, padding: "11px 6px", minHeight: 44,
            background: view === n.key ? "linear-gradient(135deg, #00F0FF18 0%, #F2B8B418 100%)" : "transparent",
            border: `1px solid ${view === n.key ? "#00F0FF28" : "transparent"}`,
            borderRadius: 10, color: view === n.key ? "#e0e0e0" : "#444",
            fontSize: 13, fontWeight: view === n.key ? 600 : 400,
            cursor: "pointer", transition: "all 0.2s",
          }}>{n.label}</button>
        ))}
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
        />
      )}

      {view === "list" && (
        <ListView
          ideas={ideas}
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

      {view === "settings" && (
        <SettingsView
          ideas={ideas}
          onClearIdeas={() => persistIdeas([])}
          flash={flash}
        />
      )}

      {/* BRANDING FOOTER */}
      <div style={{
        margin: "0 20px", padding: "20px 0",
        borderTop: "1px solid #0e0e1e",
        display: "flex", justifyContent: "center", gap: 6,
        fontSize: 10, color: "#222", letterSpacing: 1,
      }}>
        <span>© 2026</span>
        <a href="https://hackadittliv.se" target="_blank" rel="noopener noreferrer"
          style={{ color: "#F2B8B4", textDecoration: "none" }}>Hackadittliv</a>
        <span>·</span>
        <span>Byggt av</span>
        <a href="https://conversify.io" target="_blank" rel="noopener noreferrer"
          style={{ color: "#13c8ec", textDecoration: "none" }}>Conversify.io</a>
        <span>·</span>
        <button onClick={() => setShowPrivacy(true)} style={{
          background: "none", border: "none", padding: 0,
          color: "#333", fontSize: 10, letterSpacing: 1, cursor: "pointer",
        }}>Integritetspolicy</button>
      </div>
    </div>
  );
}
