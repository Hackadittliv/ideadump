import { iceTotal } from "./iceCalc.js";

export function exportToCSV(ideas) {
  const headers = [
    "Datum", "Varumärke", "Status", "Sammanfattning",
    "ICE Total", "Impact", "Confidence", "Ease",
    "Energi", "Potential", "Taggar", "Nästa steg", "Anteckningar", "Originaltranskript",
  ];

  const rows = ideas.map(idea => {
    const scores = idea.manualScores || idea.aiAnalysis?.ice || {};
    const ai = idea.aiAnalysis || {};
    return [
      new Date(idea.createdAt).toLocaleDateString("sv-SE"),
      idea.brand,
      idea.status,
      ai.summary || idea.transcript?.slice(0, 100) || "",
      iceTotal(idea),
      scores.impact ?? "",
      scores.confidence ?? "",
      scores.ease ?? "",
      idea.manualScores?.energy ?? ai.energyScore ?? "",
      ai.potentialScore ?? "",
      (ai.tags || []).join(", "),
      ai.nextActionSuggestion || "",
      (idea.notes || "").replace(/\n/g, " "),
      (idea.transcript || "").replace(/\n/g, " "),
    ];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ideadump-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
