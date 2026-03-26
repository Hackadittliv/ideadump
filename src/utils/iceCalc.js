export function iceTotal(idea) {
  const s = idea.manualScores || idea.aiAnalysis?.ice;
  if (!s) return 0;
  return Math.round(((s.impact + s.confidence + s.ease) / 3) * 10) / 10;
}
