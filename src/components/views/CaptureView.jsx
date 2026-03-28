export default function CaptureView({
  transcript, setTranscript,
  isRecording, isAnalyzing,
  voiceMode, setVoiceMode,
  onToggleRecord, onAnalyze, onSaveRaw,
}) {
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ padding: "26px 20px" }} className="appear">
      {/* Röstläge-väljare */}
      <div style={{
        display: "flex", background: "#070714", borderRadius: 12, padding: 4,
        marginBottom: 30, gap: 4, border: "1px solid #111128",
      }}>
        {[["browser", "🔴 Browser (snabb)"], ["whisper", "🎙 Whisper (OpenAI)"]].map(([k, l]) => (
          <button key={k} onClick={() => setVoiceMode(k)} style={{
            flex: 1, padding: "8px 0",
            background: voiceMode === k ? "#00F0FF18" : "transparent",
            border: `1px solid ${voiceMode === k ? "#00F0FF33" : "transparent"}`,
            borderRadius: 9, color: voiceMode === k ? "#00F0FF" : "#777",
            fontSize: 12, cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {/* Mikrofon-knapp */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 30 }}>
        <button onClick={onToggleRecord} style={{
          width: 110, height: 110, borderRadius: "50%", cursor: "pointer",
          background: isRecording
            ? "radial-gradient(circle at 35% 35%, #ff4466 0%, #cc0033 100%)"
            : "radial-gradient(circle at 35% 35%, #00F0FF18 0%, #003c4a 100%)",
          border: `2px solid ${isRecording ? "#ff3355" : "#00F0FF55"}`,
          fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center",
          animation: isRecording ? "rec-pulse 1.2s infinite" : "idle-glow 3s infinite",
          transition: "background 0.3s, border 0.3s",
        }}>
          {isRecording ? "⏹" : "🎙"}
        </button>
        <p style={{
          margin: "12px 0 0", fontSize: 12,
          color: isRecording ? "#ff3355" : "#777", letterSpacing: 1, textTransform: "uppercase",
        }}>
          {isRecording ? "● Spelar in — tryck för att stoppa" : "Tryck för att börja tala"}
        </p>
        {isRecording && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#555", textAlign: "center" }}>
            Håll skärmen på under inspelning
          </p>
        )}
      </div>

      {/* Transkript */}
      <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
        autoFocus
        inputMode="text"
        placeholder="Transkriptet dyker upp här medan du pratar... eller skriv direkt."
        style={{
          width: "100%", minHeight: 130, background: "#070714",
          border: `1px solid ${transcript ? "#1e1e3a" : "#0e0e22"}`,
          borderRadius: 14, padding: "14px 16px", color: "#ccc", fontSize: 16,
          lineHeight: 1.6, resize: "vertical", fontFamily: "inherit",
          boxSizing: "border-box", outline: "none",
        }} />

      {transcript && (
        <div style={{ textAlign: "right", fontSize: 10, color: "#666", marginTop: 5 }}>
          {wordCount} ord
        </div>
      )}

      {/* Åtgärdsknappar */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={onAnalyze} disabled={!transcript.trim() || isAnalyzing}
          className="btn-primary" style={{
          flex: 2, padding: "15px 0",
          background: transcript.trim() && !isAnalyzing
            ? "linear-gradient(135deg, #00F0FF28 0%, #00c8d440 100%)" : "#070714",
          border: `1px solid ${transcript.trim() && !isAnalyzing ? "#00F0FF55" : "#0e0e22"}`,
          borderRadius: 14, fontSize: 14, fontWeight: 600,
          color: transcript.trim() && !isAnalyzing ? "#00F0FF" : "#444",
          cursor: transcript.trim() && !isAnalyzing ? "pointer" : "not-allowed", transition: "all 0.2s",
        }}>
          {isAnalyzing ? "⏳ Analyserar..." : "✨ Analysera med Claude"}
        </button>
        <button onClick={onSaveRaw} disabled={!transcript.trim()}
          className="btn-ghost" style={{
          flex: 1, padding: "15px 0", background: "transparent",
          border: "1px solid #111128", borderRadius: 14,
          color: "#888", fontSize: 13, cursor: transcript.trim() ? "pointer" : "not-allowed",
        }}>
          💾 Spara
        </button>
      </div>
    </div>
  );
}
