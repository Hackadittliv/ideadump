export default function ProsCons({ pros, cons }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
      <div style={{ background: "#00ff8808", border: "1px solid #00ff8828", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ fontSize: 10, color: "#00ff88", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
          ✅ Pros
        </div>
        {pros?.map((p, i) => (
          <div key={i} style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5, marginBottom: 5, display: "flex", gap: 6 }}>
            <span style={{ color: "#00ff8866", flexShrink: 0 }}>+</span>
            <span>{p}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "#ff444408", border: "1px solid #ff444428", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ fontSize: 10, color: "#ff6666", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>
          ❌ Cons
        </div>
        {cons?.map((c, i) => (
          <div key={i} style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5, marginBottom: 5, display: "flex", gap: 6 }}>
            <span style={{ color: "#ff444466", flexShrink: 0 }}>−</span>
            <span>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
