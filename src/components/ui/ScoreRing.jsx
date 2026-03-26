export default function ScoreRing({ value, max = 10, color = "#00F0FF", size = 52, label }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (value / max) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#111128" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.5s ease" }} />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color}
          style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700 }}>{value}</text>
      </svg>
      {label && (
        <span style={{ fontSize: 9, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>
          {label}
        </span>
      )}
    </div>
  );
}
