import { useState } from "react";
import IdeaCard from "../IdeaCard.jsx";
import { BRANDS, STATUSES, BRAND_COLORS } from "../../styles/theme.js";
import { iceTotal } from "../../utils/iceCalc.js";

const SORT_OPTIONS = [
  { key: "ice",    label: "ICE" },
  { key: "date",   label: "Datum" },
  { key: "energy", label: "Energi" },
  { key: "potential", label: "Potential" },
];

export default function ListView({
  ideas, onUpdateIdea, onDeleteIdea,
  expandedId, setExpandedId,
  filterBrand, setFilterBrand,
  filterStatus, setFilterStatus,
  onGoCapture,
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("ice");
  const [filterTag, setFilterTag] = useState(null);

  const filtered = ideas
    .filter(i => filterBrand === "Alla" || i.brand === filterBrand)
    .filter(i => filterStatus === "Alla" || i.status === filterStatus)
    .filter(i => !filterTag || i.aiAnalysis?.tags?.includes(filterTag))
    .filter(i => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        i.transcript?.toLowerCase().includes(q) ||
        i.aiAnalysis?.summary?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q) ||
        i.aiAnalysis?.tags?.some(t => t.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "ice") return iceTotal(b) - iceTotal(a);
      if (sortBy === "date") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "energy") return (b.aiAnalysis?.energyScore || 0) - (a.aiAnalysis?.energyScore || 0);
      if (sortBy === "potential") return (b.aiAnalysis?.potentialScore || 0) - (a.aiAnalysis?.potentialScore || 0);
      return 0;
    });

  // Samla alla unika taggar från filtrerade idéer (utan tagg-filter)
  const allTags = [...new Set(
    ideas
      .filter(i => filterBrand === "Alla" || i.brand === filterBrand)
      .filter(i => filterStatus === "Alla" || i.status === filterStatus)
      .flatMap(i => i.aiAnalysis?.tags || [])
  )].slice(0, 12);

  return (
    <div style={{ padding: "20px 20px" }} className="appear">

      {/* Sökfält */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#333" }}>🔍</span>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Sök idéer..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#0c0c1e", border: "1px solid #181830",
            borderRadius: 12, padding: "12px 12px 12px 36px",
            color: "#ccc", fontSize: 16, fontFamily: "inherit", outline: "none",
          }}
        />
        {search && (
          <button onClick={() => setSearch("")}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "transparent", border: "none", color: "#444", fontSize: 16, cursor: "pointer",
            }}>✕</button>
        )}
      </div>

      {/* Brand-filter */}
      <div style={{ overflowX: "auto", display: "flex", gap: 6, marginBottom: 10, paddingBottom: 4 }}>
        {["Alla", ...BRANDS].map(b => {
          const c = BRAND_COLORS[b] || "#00F0FF";
          return (
            <button key={b} onClick={() => setFilterBrand(b)} style={{
              flexShrink: 0, padding: "10px 14px", minHeight: 44,
              background: filterBrand === b ? c + "22" : "transparent",
              border: `1px solid ${filterBrand === b ? c + "66" : "#111128"}`,
              borderRadius: 20, color: filterBrand === b ? c : "#777",
              fontSize: 11, fontWeight: filterBrand === b ? 700 : 400, cursor: "pointer",
            }}>{b}</button>
          );
        })}
      </div>

      {/* Status-filter */}
      <div style={{ overflowX: "auto", display: "flex", gap: 6, marginBottom: 10, paddingBottom: 4 }}>
        {["Alla", ...STATUSES.map(s => s.key)].map(s => {
          const st = STATUSES.find(x => x.key === s);
          return (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              flexShrink: 0, padding: "10px 14px", minHeight: 44,
              background: filterStatus === s ? "#ffffff0d" : "transparent",
              border: `1px solid ${filterStatus === s ? "#ffffff22" : "#111128"}`,
              borderRadius: 20, color: filterStatus === s ? "#ccc" : "#777",
              fontSize: 11, cursor: "pointer",
            }}>
              {s === "Alla" ? "Alla" : `${st?.icon} ${st?.label}`}
            </button>
          );
        })}
      </div>

      {/* Tagg-filter (visas om det finns taggar) */}
      {allTags.length > 0 && (
        <div style={{ overflowX: "auto", display: "flex", gap: 6, marginBottom: 10, paddingBottom: 4 }}>
          {filterTag && (
            <button onClick={() => setFilterTag(null)} style={{
              flexShrink: 0, padding: "6px 12px", minHeight: 36,
              background: "#ffffff0d", border: "1px solid #ffffff22",
              borderRadius: 20, color: "#ccc", fontSize: 11, cursor: "pointer",
            }}>✕ Alla taggar</button>
          )}
          {allTags.map(t => (
            <button key={t} onClick={() => setFilterTag(filterTag === t ? null : t)} style={{
              flexShrink: 0, padding: "6px 12px", minHeight: 36,
              background: filterTag === t ? "#00F0FF22" : "transparent",
              border: `1px solid ${filterTag === t ? "#00F0FF44" : "#111128"}`,
              borderRadius: 20, color: filterTag === t ? "#00F0FF" : "#777",
              fontSize: 11, cursor: "pointer",
            }}>#{t}</button>
          ))}
        </div>
      )}

      {/* Sortering + räknare */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: "#777", letterSpacing: 1, textTransform: "uppercase" }}>
          {filtered.length} idé{filtered.length !== 1 ? "er" : ""}
          {search && ` · "${search}"`}
          {filterTag && ` · #${filterTag}`}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {SORT_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setSortBy(o.key)} style={{
              background: sortBy === o.key ? "#00F0FF18" : "transparent",
              border: `1px solid ${sortBy === o.key ? "#00F0FF33" : "#111128"}`,
              borderRadius: 8, padding: "5px 10px",
              color: sortBy === o.key ? "#00F0FF" : "#777",
              fontSize: 10, cursor: "pointer",
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Tom-vy */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>💡</div>
          <p style={{ color: "#777", fontSize: 14 }}>
            {ideas.length === 0 ? "Inga idéer än. Fånga din första!" : "Inga idéer matchar filtret."}
          </p>
          {ideas.length === 0 && (
            <button onClick={onGoCapture} style={{
              background: "#00F0FF18", border: "1px solid #00F0FF33",
              borderRadius: 12, padding: "10px 22px", color: "#00F0FF",
              fontSize: 13, cursor: "pointer", marginTop: 8,
            }}>
              🎙 Fånga en idé
            </button>
          )}
        </div>
      ) : (
        filtered.map(idea => (
          <div key={idea.id} className="appear">
            <IdeaCard
              idea={idea}
              expanded={expandedId === idea.id}
              onToggle={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
              onUpdate={onUpdateIdea}
              onDelete={id => { onDeleteIdea(id); setExpandedId(null); }}
              onTagClick={tag => setFilterTag(filterTag === tag ? null : tag)}
            />
          </div>
        ))
      )}
    </div>
  );
}
