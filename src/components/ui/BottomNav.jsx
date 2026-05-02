// BottomNav.jsx — IdeaDump bottom tab bar
// Fyra flikar med gradient-underline på aktiv + cyan badge för inbox.

const NAV_COLORS = {
  bgDark: "#070714ee",
  borderTop: "#111128",
  textActive: "#e0e0e0",
  textInactive: "#777",
  badgeBg: "#00F0FF",
  badgeText: "#02020e",
};

function MicGlyph({ filled, c }) {
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="8" y="3" width="8" height="12" rx="4" fill={c} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 18v3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="8.5" y="3.5" width="7" height="11" rx="3.5" stroke={c} strokeWidth="1.6" />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 18v3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ListGlyph({ filled, c }) {
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="17" rx="2.5" fill={c} opacity="0.22" />
      <rect x="4" y="4" width="16" height="17" rx="2.5" stroke={c} strokeWidth="1.6" />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1" fill={c} />
      <path d="M8 11h8M8 14.5h8M8 18h5" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4.5" y="4.5" width="15" height="16" rx="2.5" stroke={c} strokeWidth="1.6" />
      <rect x="9" y="2.5" width="6" height="3.5" rx="1" stroke={c} strokeWidth="1.6" fill="none" />
      <path d="M8 11h8M8 14.5h8M8 18h5" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CalendarGlyph({ filled, c }) {
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" fill={c} opacity="0.22" />
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke={c} strokeWidth="1.6" />
      <path d="M3.5 10h17" stroke={c} strokeWidth="1.6" />
      <path d="M8 3.5v4M16 3.5v4" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
      <rect x="13" y="13" width="4" height="4" rx="0.8" fill={c} />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke={c} strokeWidth="1.6" />
      <path d="M3.5 10h17" stroke={c} strokeWidth="1.6" />
      <path d="M8 3.5v4M16 3.5v4" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BrainGlyph({ filled, c }) {
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 4.5C7.5 4.5 6 5.6 6 7.2c-1.4.4-2.4 1.7-2.4 3.2 0 .9.4 1.7 1 2.3-.4.5-.6 1.1-.6 1.8 0 1.5 1.1 2.8 2.6 3 .2 1.5 1.5 2.7 3.1 2.7 1 0 1.9-.4 2.5-1.1.6.7 1.5 1.1 2.5 1.1 1.6 0 2.9-1.2 3.1-2.7 1.5-.2 2.6-1.5 2.6-3 0-.7-.2-1.3-.6-1.8.6-.6 1-1.4 1-2.3 0-1.5-1-2.8-2.4-3.2 0-1.6-1.5-2.7-3-2.7-1 0-1.9.4-2.5 1.1C10.9 4.9 10 4.5 9 4.5Z" fill={c} opacity="0.22" stroke={c} strokeWidth="1.4"/>
      <path d="M12 6v13" stroke={c} strokeWidth="1.2" opacity="0.6"/>
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 4.5C7.5 4.5 6 5.6 6 7.2c-1.4.4-2.4 1.7-2.4 3.2 0 .9.4 1.7 1 2.3-.4.5-.6 1.1-.6 1.8 0 1.5 1.1 2.8 2.6 3 .2 1.5 1.5 2.7 3.1 2.7 1 0 1.9-.4 2.5-1.1.6.7 1.5 1.1 2.5 1.1 1.6 0 2.9-1.2 3.1-2.7 1.5-.2 2.6-1.5 2.6-3 0-.7-.2-1.3-.6-1.8.6-.6 1-1.4 1-2.3 0-1.5-1-2.8-2.4-3.2 0-1.6-1.5-2.7-3-2.7-1 0-1.9.4-2.5 1.1C10.9 4.9 10 4.5 9 4.5Z" stroke={c} strokeWidth="1.4"/>
    </svg>
  );
}

function GearGlyph({ filled, c }) {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = 12 + Math.cos(a) * 8.2;
    const y1 = 12 + Math.sin(a) * 8.2;
    const x2 = 12 + Math.cos(a) * 10.2;
    const y2 = 12 + Math.sin(a) * 10.2;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth="2.2" strokeLinecap="round" />;
  });
  return filled ? (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {teeth}
      <circle cx="12" cy="12" r="7" fill={c} opacity="0.22" />
      <circle cx="12" cy="12" r="7" stroke={c} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.4" fill={c} />
    </svg>
  ) : (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      {teeth}
      <circle cx="12" cy="12" r="7" stroke={c} strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.4" stroke={c} strokeWidth="1.6" />
    </svg>
  );
}

const TAB_DEFS = [
  { key: "capture",     label: "Capture",   Glyph: MicGlyph },
  { key: "list",        label: "Idéer",     Glyph: ListGlyph },
  { key: "weekly",      label: "Vecka",     Glyph: CalendarGlyph },
  { key: "reflections", label: "Lärdomar",  Glyph: BrainGlyph },
  { key: "settings",    label: "Mer",       Glyph: GearGlyph },
];

function formatBadge(n) {
  if (!n || n <= 0) return null;
  return n > 99 ? "99+" : String(n);
}

function Badge({ count }) {
  const text = formatBadge(count);
  if (!text) return null;
  const isWide = text === "99+";
  return (
    <div
      aria-label={`${count} nya`}
      style={{
        position: "absolute",
        top: -4,
        right: isWide ? -12 : -8,
        minWidth: isWide ? 26 : 18,
        height: 18,
        padding: isWide ? "0 5px" : "0 4px",
        borderRadius: 999,
        background: NAV_COLORS.badgeBg,
        color: NAV_COLORS.badgeText,
        fontFamily: "'DM Mono', ui-monospace, monospace",
        fontWeight: 600,
        fontSize: 11,
        lineHeight: "18px",
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 0 2px #070714, 0 0 10px rgba(0,240,255,0.45)",
        letterSpacing: 0,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

function BottomNavTab({ tab, active, badgeCount, onSelect }) {
  const c = active ? NAV_COLORS.textActive : NAV_COLORS.textInactive;
  return (
    <button
      onClick={() => onSelect(tab.key)}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      style={{
        flex: 1,
        minWidth: 44,
        minHeight: 44,
        height: 64,
        position: "relative",
        background: "transparent",
        border: "none",
        padding: "8px 4px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        cursor: "pointer",
        color: c,
        transition: "color 0.2s ease",
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      }}
    >
      <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <tab.Glyph filled={active} c={c} />
        {tab.key === "list" && <Badge count={badgeCount} />}
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: active ? 500 : 400,
          letterSpacing: 0.1,
          lineHeight: 1,
          color: c,
        }}
      >
        {tab.label}
      </div>

      {active && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            bottom: 6,
            transform: "translateX(-50%)",
            width: 28,
            height: 2,
            borderRadius: 2,
            background: "linear-gradient(90deg, #00F0FF 0%, #F2B8B4 100%)",
          }}
        />
      )}
    </button>
  );
}

export default function BottomNav({ view, onNav, inboxCount = 0 }) {
  return (
    <nav
      aria-label="Huvudnavigation"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: NAV_COLORS.bgDark,
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        borderTop: `1px solid ${NAV_COLORS.borderTop}`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          justifyContent: "space-between",
          maxWidth: 500,
          margin: "0 auto",
          padding: "0 4px",
        }}
      >
        {TAB_DEFS.map((t) => (
          <BottomNavTab
            key={t.key}
            tab={t}
            active={view === t.key}
            badgeCount={t.key === "list" ? inboxCount : 0}
            onSelect={onNav}
          />
        ))}
      </div>
    </nav>
  );
}
