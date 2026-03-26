# IdeaDump — Projektkontext

## Projektöversikt
IdeaDump är en **röstdriven idéfångst-app med AI-analys**. Verktyget är byggt för Christian Wederbrand och används för att snabbt fånga idéer (via röst eller text), analysera dem med ICE-scoring och AI-coaching samt organisera dem per varumärke.

**Ägare:** Conversify.io / Hackadittliv
**Domän:** TBD (Netlify deploy)
**Språk:** Svenska (all UI, alla texter, alla felmeddelanden)

---

## Teknisk stack

| Lager | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite (JSX) |
| Styling | Inline styles (dark theme, cyan accent #00F0FF) |
| AI-analys | Anthropic Claude API (pros/cons, ICE-scoring, coaching) |
| Rösttranskription | OpenAI Whisper API (valfritt) |
| Data | localStorage (persistent, ingen backend) |
| Hosting | Netlify |
| PWA | manifest.json + Service Worker |

### VIKTIGA begränsningar
- **Ingen backend/databas** — all data i localStorage
- **API-nycklar** sparas i localStorage via inställningspanelen (⚙️)
- **Inga TypeScript** — projektet använder `.jsx`
- **Inga externa CSS-ramverk** — inline styles genomgående
- **PWA-first** — ska fungera som installerad app på iPhone

---

## Bash-kommandon

```bash
# Starta dev-server
npm run dev

# Bygga för produktion
npm run build

# Förhandsgranska build
npm run preview

# Deploya till Netlify
netlify deploy --prod --dir=dist
```

---

## Kodstil

- **ES Modules** (import/export), inte CommonJS
- Destructure imports: `import { useState } from 'react'`
- Funktionella React-komponenter med hooks
- Filnamn: `kebab-case.jsx` för komponenter, `camelCase.js` för utils
- Mappar: feature-baserad struktur (se `/src` nedan)
- Kommentarer på svenska
- Felmeddelanden till användare ALLTID på svenska
- Inline styles med dark theme-variabler

---

## Varumärken (Brands)

```js
const BRANDS = ["HDL", "Conversify", "Life Is Awesome", "Timeless Brick", "Övrigt"];
const BRAND_COLORS = {
  HDL: "#00F0FF",
  Conversify: "#13c8ec",
  "Life Is Awesome": "#F2B8B4",
  "Timeless Brick": "#e8a87c",
  Övrigt: "#666",
};
```

## Statusar (Idéflöde)

```js
const STATUSES = [
  { key: "inbox",    label: "Inbox",       icon: "📥" },
  { key: "next",     label: "Next Action", icon: "🎯" },
  { key: "incubate", label: "Inkubera",    icon: "💤" },
  { key: "park",     label: "Parkera",     icon: "📦" },
  { key: "done",     label: "Klar",        icon: "✅" },
];
```

---

## ICE-scoring

Varje idé scoreas på:
- **Impact** (1–10): Hur stor effekten är
- **Confidence** (1–10): Hur säker vi är
- **Ease** (1–10): Hur lätt att genomföra

`ICE Total = (Impact + Confidence + Ease) / 3`

---

## Mappstruktur

```
src/
  components/
    ui/          ← återanvändbara UI-komponenter (ScoreRing, Slider, etc.)
    views/       ← sidvyer / flikar (IdeaList, IdeaDetail, etc.)
  context/       ← React contexts (om det behövs)
  utils/         ← helpers (ice-calc, export, etc.)
  styles/        ← tema-konstanter (colors, spacing)
  App.jsx        ← root-komponent
  main.jsx       ← entry point
netlify/
  functions/     ← serverless functions (om det behövs framöver)
public/
  manifest.json  ← PWA-manifest
  icon-192.png   ← PWA-ikon
  icon-512.png   ← PWA-ikon
```

---

## Routing
Ingen router — single-page app med intern state för navigation.

---

## Miljövariabler / API-nycklar

API-nycklar läggs in av användaren i appen (⚙️ Inställningar) och sparas i localStorage:
- `anthropic_key` — Anthropic Claude API
- `openai_key` — OpenAI Whisper API (valfritt)

Netlify Functions kan behöva env vars i Netlify dashboard:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

---

## PWA / Siri-integration

Appen stöder `?autorecord=true` i URL för att starta mikrofonen automatiskt.
Siri-genväg: "Hej Siri, dumpa en idé" → öppnar appen med autorecord.

---

## VIKTIGT — saker att hålla koll på

1. **localStorage-storlek** — max ~5MB, exportera data regelbundet
2. **Whisper API** — valfritt, appen fungerar utan det (manuell textinmatning)
3. **Claude API rate limits** — visa loading-state vid AI-analys
4. **Mobile-first** — testa ALLTID på 375px bredd
5. **PWA-ikoner** — icon-192.png och icon-512.png måste finnas i /public
6. **Autorecord** — hantera browser-permissions för mikrofon elegant
