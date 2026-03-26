# IdeaDump

Röstdriven idéfångst med AI-analys. Byggt för Christian Wederbrand / HDL.

## Stack
- React + Vite
- Anthropic Claude API (analys, pros/cons, coaching)
- OpenAI Whisper API (rösttranskription, valfritt)
- localStorage (persistent data)
- PWA (fungerar som app på iPhone)

## Kom igång

```bash
npm install
npm run dev
```

## Deploya till Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

## Ikoner

Lägg till två ikoner i /public:
- icon-192.png (192x192)
- icon-512.png (512x512)

Förslag: Skapa i Canva med mörk bakgrund (#02020e) och cyan mikrofon-symbol (#00F0FF).

## Siri-genväg (iPhone)

1. Öppna appen i Safari, tryck ⬆️ och "Lägg till på hemskärmen"
2. Öppna Genvägar, skapa ny genväg: "Öppna URL"
3. URL: https://din-app.netlify.app?autorecord=true
4. Döp till "Dumpa en idé"
5. Säg "Hej Siri, dumpa en idé" — mikrofonen startar automatiskt

## API-nycklar

Läggs in i appen under ⚙️ Inställningar. Sparas i localStorage.
- Anthropic: https://console.anthropic.com
- OpenAI: https://platform.openai.com
