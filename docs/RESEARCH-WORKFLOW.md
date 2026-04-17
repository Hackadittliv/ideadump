# Research-läge — IdeaDump → Claude Code + NotebookLM

Servern (Netlify) kan inte köra NotebookLM-CLI:t eftersom det kräver din lokala Google-session. Därför körs djupresearch lokalt via Claude Code-skills istället.

## Flödet

1. I IdeaDump-appen markerar du en idé som intressant
2. Kopiera idéns **ID** (syns i idé-kortet eller via CSV-export)
3. I Claude Code säg: `/idea-to-doc [ID eller beskrivning]`

Skill-kedjan som körs:

```
/idea-to-doc
  ↓
  hämtar idén från Supabase (eller senaste cloud-dump)
  ↓
  expanderar innehållet med Claude (kontext, hypotes, 90-dagarsplan)
  ↓
  skapar Google Doc i mappen "IdeaDump Exports"
  ↓
  returnerar URL
```

## Kombinerat med NotebookLM

Om du vill använda NotebookLM:s djupresearch istället (eller utöver):

```
/notebooklm create "Research: [idé-titel]"
/notebooklm source add --url "[idé-URL från IdeaDump Docs]"
/notebooklm generate --type "audio-overview"
```

Skillen `ideadump-notebooks` är redan installerad och kopplar ihop hela 3-lagers-arkitekturen: Drive råfångst → NotebookLM "Ideadump" → Google Sheets.

## I appen (inbyggt)

För snabb marknads-validering finns redan två knappar på varje idé-kort:

- **🔎 Validera mot marknaden** — Exa search + Claude-sammanfattning
- **🔬 Tripel-check** — Exa + Perplexity + Claude web search i parallell

Dessa kräver ingen lokal setup och ger resultat inom 30 sekunder.

## Varför inte i appen?

NotebookLM-CLI:t `notebooklm-py` är en icke-officiell integration som använder Playwright + dina webbcookies för att driva NotebookLM's webbgränssnitt. Det kräver:

- Lokal Chrome/Chromium
- Din Google-inloggning som webbsession
- Persistent cookies

Inget av detta fungerar i Netlify Functions (stateless, headless, ingen browser). Därför körs denna integration via Claude Code lokalt.
