// Utvärdering (Rubrics) — lättvikts mätningar av agentens kvalitet:
// 1. Accept-rate på AI-genererade reflections (är de träffsäkra?)
// 2. Outcome-distribution per energyWarning (förutspår "distraction" verkliga
//    utfall, eller överkallar AI:n distractions?)
// 3. Skills-användning (vilka playbooks triggas faktiskt?)
import { useEffect, useState, useMemo } from "react";
import { listReflections, pruneStaleReflections } from "../../utils/reflections.js";
import { listOutcomes, OUTCOMES, OUTCOME_LABEL } from "../../utils/outcomes.js";
import { listSkills } from "../../utils/skills.js";

const POSITIVE_OUTCOMES = new Set(["shipped", "sold", "still_working"]);
const NEGATIVE_OUTCOMES = new Set(["killed", "stalled"]);

function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0; }

export default function RubricsPanel() {
  const [reflections, setReflections] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pruning, setPruning] = useState(false);
  const [pruneMsg, setPruneMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listReflections(), listOutcomes(), listSkills()])
      .then(([r, o, s]) => {
        if (cancelled) return;
        setReflections(r); setOutcomes(o); setSkills(s);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    // Accept-rate: AI-genererade som blivit active/pinned vs total avgjorda
    const aiGenerated = reflections.filter(r => r.source !== "manual");
    const aiActive = aiGenerated.filter(r => r.status === "active" || r.status === "pinned").length;
    const aiArchived = aiGenerated.filter(r => r.status === "archived").length;
    const aiPending = aiGenerated.filter(r => r.status === "pending").length;
    const decided = aiActive + aiArchived;
    const acceptRate = pct(aiActive, decided);

    // Outcome-distribution
    const total = outcomes.length;
    const byOutcome = OUTCOMES.map(o => ({
      ...o,
      count: outcomes.filter(x => x.outcome === o.key).length,
    }));

    // EnergyWarning-precision: bland outcomes där AI:n förutspådde "distraction",
    // hur många blev faktiskt killed/stalled? Och bland "genuine" — hur många blev shipped/sold?
    const distractions = outcomes.filter(o => o.predicted_warning === "distraction");
    const distractionsCorrect = distractions.filter(o => NEGATIVE_OUTCOMES.has(o.outcome)).length;
    const genuines = outcomes.filter(o => o.predicted_warning === "genuine");
    const genuinesCorrect = genuines.filter(o => POSITIVE_OUTCOMES.has(o.outcome)).length;

    const enabledSkills = skills.filter(s => s.enabled).length;
    const usedSkills = skills.filter(s => s.last_used_at).length;

    return {
      ai: { aiGenerated: aiGenerated.length, aiActive, aiArchived, aiPending, decided, acceptRate },
      outcomes: { total, byOutcome },
      precision: {
        distractions: distractions.length,
        distractionsCorrect,
        distractionAcc: pct(distractionsCorrect, distractions.length),
        genuines: genuines.length,
        genuinesCorrect,
        genuineAcc: pct(genuinesCorrect, genuines.length),
      },
      skills: { total: skills.length, enabled: enabledSkills, used: usedSkills },
    };
  }, [reflections, outcomes, skills]);

  const reload = async () => {
    try {
      const [r, o, s] = await Promise.all([listReflections(), listOutcomes(), listSkills()]);
      setReflections(r); setOutcomes(o); setSkills(s);
    } catch (e) { setError(e.message); }
  };

  const handlePrune = async () => {
    setPruning(true); setPruneMsg("");
    try {
      const archived = await pruneStaleReflections();
      setPruneMsg(archived === 0
        ? "Inga oanvända lärdomar att arkivera."
        : `Arkiverade ${archived} oanvänd${archived === 1 ? "" : "a"} lärdom${archived === 1 ? "" : "ar"}.`);
      await reload();
      setTimeout(() => setPruneMsg(""), 6000);
    } catch (e) {
      setPruneMsg("Fel: " + e.message);
    } finally {
      setPruning(false);
    }
  };

  if (loading) return <p style={{ fontSize: 12, color: "#666" }}>Laddar...</p>;
  if (error) return <p style={{ fontSize: 12, color: "#ff6644" }}>Fel: {error}</p>;

  const { ai, outcomes: oc, precision, skills: sk } = stats;
  const tooFewOutcomes = oc.total < 5;

  return (
    <div>
      <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888", lineHeight: 1.6 }}>
        Mätning av om agenten faktiskt blir bättre. Mer data = mer pålitliga siffror.
      </p>

      <Section title="🧠 AI-genererade lärdomar" subtitle={`${ai.aiGenerated} totalt · ${ai.aiPending} väntar på beslut`}>
        {ai.decided === 0 ? (
          <Empty text="Du har ännu inte godkänt eller arkiverat någon AI-genererad lärdom." />
        ) : (
          <>
            <Stat label="Accept-rate" value={`${ai.acceptRate}%`} hint={`${ai.aiActive} godkända / ${ai.decided} avgjorda`} />
            {ai.acceptRate < 40 && ai.decided >= 5 && (
              <Hint>⚠️ Låg accept-rate — söndagsanalysen träffar inte rätt. Skriv tydligare egna lärdomar så Claude får bättre kontext att bygga på.</Hint>
            )}
          </>
        )}
      </Section>

      <Section title="🎯 Utfall per idé" subtitle={`${oc.total} idéer markerade`}>
        {tooFewOutcomes ? (
          <Empty text={`Behöver minst 5 utfall för att visa något meningsfullt (${oc.total} hittills).`} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {oc.byOutcome.filter(o => o.count > 0).map(o => (
              <Bar key={o.key} label={`${o.icon} ${o.label}`} value={o.count} max={oc.total} color={o.color} />
            ))}
          </div>
        )}
      </Section>

      <Section title="🔮 AI-precision" subtitle="Stämde 'distraction'/'genuine' med utfallet?">
        {tooFewOutcomes ? (
          <Empty text="Behöver minst 5 utfall för precision-mätning." />
        ) : (
          <>
            <Stat
              label="🚫 Distraction-träffsäkerhet"
              value={precision.distractions ? `${precision.distractionAcc}%` : "—"}
              hint={precision.distractions
                ? `${precision.distractionsCorrect}/${precision.distractions} flaggade idéer dog/fastnade`
                : "Inga distraction-flaggade idéer ännu"}
            />
            <Stat
              label="✨ Genuine-träffsäkerhet"
              value={precision.genuines ? `${precision.genuineAcc}%` : "—"}
              hint={precision.genuines
                ? `${precision.genuinesCorrect}/${precision.genuines} godkända idéer genomfördes`
                : "Inga genuine-flaggade idéer ännu"}
            />
          </>
        )}
      </Section>

      <Section title="🛠 Tekniker" subtitle={`${sk.enabled}/${sk.total} aktiva`}>
        {sk.total === 0 ? (
          <Empty text="Du har inga tekniker än. Lägg till playbooks i Tekniker-fliken." />
        ) : (
          <Stat
            label="Använda minst en gång"
            value={`${sk.used}/${sk.enabled}`}
            hint={sk.used < sk.enabled ? "Vissa tekniker triggas aldrig — ompröva trigger-villkoren." : "Alla aktiva tekniker har triggat."}
          />
        )}
      </Section>

      <Section title="🧹 Underhåll" subtitle="Håll prompt-bloat i schack">
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#888", lineHeight: 1.6 }}>
          Arkiverar aktiva lärdomar som inte använts på 60 dagar (eller aldrig
          använts och är skapade för 30+ dagar sedan). Pinned lämnas ifred.
        </p>
        <button
          onClick={handlePrune}
          disabled={pruning}
          style={{
            width: "100%", padding: "10px", minHeight: 40,
            background: pruning ? "#0a0a1a" : "#ffaa0010",
            border: `1px solid ${pruning ? "#222" : "#ffaa0044"}`,
            borderRadius: 8,
            color: pruning ? "#666" : "#ffaa00",
            fontSize: 12, cursor: pruning ? "wait" : "pointer",
          }}
        >
          {pruning ? "Arkiverar..." : "🧹 Arkivera oanvända lärdomar"}
        </button>
        {pruneMsg && (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: pruneMsg.startsWith("Fel") ? "#ff6644" : "#00ff88" }}>
            {pruneMsg}
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div style={{
      background: "#0a0a18", border: "1px solid #1e1e3a",
      borderRadius: 12, padding: 14, marginBottom: 12,
    }}>
      <p style={{ margin: "0 0 2px", fontSize: 13, color: "#ddd", fontWeight: 700 }}>{title}</p>
      <p style={{ margin: "0 0 10px", fontSize: 11, color: "#666", letterSpacing: 0.5 }}>{subtitle}</p>
      {children}
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderTop: "1px solid #15152a" }}>
      <div>
        <p style={{ margin: 0, fontSize: 12, color: "#aaa" }}>{label}</p>
        {hint && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#666", lineHeight: 1.5 }}>{hint}</p>}
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: "#00F0FF", fontFamily: "'DM Mono', monospace" }}>{value}</span>
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const w = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color: "#888" }}>{value}</span>
      </div>
      <div style={{ height: 6, background: "#15152a", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${w}%`, height: "100%", background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <p style={{ margin: 0, fontSize: 12, color: "#666", lineHeight: 1.6 }}>{text}</p>;
}

function Hint({ children }) {
  return (
    <p style={{
      margin: "8px 0 0", padding: "8px 10px",
      background: "#ffaa0008", border: "1px solid #ffaa0033",
      borderRadius: 8, fontSize: 11, color: "#ffaa00", lineHeight: 1.6,
    }}>{children}</p>
  );
}
