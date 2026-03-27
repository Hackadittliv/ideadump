// Genererar en .ics-fil (Apple Kalender / Google Calendar)

function pad(n) { return String(n).padStart(2, "0"); }

function toICSDate(date) {
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function escapeICS(str = "") {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function exportToCalendar(idea) {
  const title = idea.aiAnalysis?.summary || idea.transcript?.slice(0, 80) || "Idé från IdeaDump";
  const nextStep = idea.aiAnalysis?.nextActionSuggestion || "";
  const coach = idea.aiAnalysis?.coachComment || "";
  const ice = idea.aiAnalysis
    ? `ICE: ${((idea.aiAnalysis.ice?.impact + idea.aiAnalysis.ice?.confidence + idea.aiAnalysis.ice?.ease) / 3).toFixed(1)}`
    : "";

  const descParts = [
    nextStep && `Nästa steg: ${nextStep}`,
    coach && `Coach: ${coach}`,
    ice,
    `Varumärke: ${idea.brand}`,
    `Skapad: ${new Date(idea.createdAt).toLocaleDateString("sv-SE")}`,
  ].filter(Boolean);

  // Använd deadline om satt, annars 2 dagar framåt, kl 09:00
  const start = idea.deadline ? new Date(idea.deadline) : new Date();
  if (!idea.deadline) start.setDate(start.getDate() + 2);
  start.setHours(9, 0, 0, 0);

  const end = new Date(start);
  end.setHours(10, 0, 0, 0);

  const now = new Date();
  const uid = `ideadump-${idea.id}@hackadittliv.se`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IdeaDump//Hackadittliv//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:🎯 ${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(descParts.join("\\n\\n"))}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ideadump-${idea.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
