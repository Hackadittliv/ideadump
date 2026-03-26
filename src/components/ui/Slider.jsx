export default function Slider({ label, value, onChange, color = "#00F0FF" }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color, fontFamily: "monospace", fontWeight: 700 }}>
          {value}
        </span>
      </div>
      <input type="range" min={1} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: "pointer", height: 4 }} />
    </div>
  );
}
