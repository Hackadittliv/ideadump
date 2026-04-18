# IdeaDump — Komplett funktionsöversikt

Röstdriven idéfångst med AI-analys. Hands-free capture → Claude-coaching → strukturerad aktivitet.

**Flödet:** Fånga (röst/text/bild) → Claude analyserar (ICE + coaching + risk) → filtrera/sortera → boka/exportera → weekly review.

---

## Vyer (4 flikar i bottom-nav)

| Flik | Vad den gör |
|---|---|
| **Capture** | Fånga nya idéer — röst, text, bild, paste |
| **Idéer** | Lista, sök, filtrera, detaljvy per idé |
| **Vecka** | AI-driven söndagsgenomgång med top-3 och vassaste revenue-vägen |
| **Inställningar** | Integrationer, varumärken, mål, export, statistik |

---

## Inputmetoder (Capture)

1. **Röst via Browser Speech API** — realtidstranskribering sv-SE, continuous mode, interim resultat live
2. **Röst via Whisper** — OpenAI:s modell via `whisper-transcribe`-function, mer exakt men långsammare
3. **Text** — direkt skriv/paste i textarea
4. **Bildanalys (Claude Vision)** — kamera eller filuppladdning, läser whiteboards/skärmdumpar/anteckningar → svensk sammanfattning
5. **Siri Shortcut** — URL-param `?autorecord=true` startar röstinspelning automatiskt (hands-free via "Hej Siri, dumpa en idé")
6. **Screen Wake Lock** — skärmen somnar inte under röstinspelning

---

## AI-features (Claude + OpenAI)

### Idé-analys (`claude-analyze.js`)

Returnerar per idé:

- **summary** — kort sammanfattning
- **ICE** — Impact / Confidence / Ease (1–10 vardera)
- **energyScore** — energierar eller dränerar idén dig (1–10)
- **potentialScore** — uppsida om idén lyckas (1–10)
- **suggestedBrand** — kopplar idén till ett av dina varumärken
- **tags** — 3–5 taggar
- **pros/cons** — 3 vardera
- **biggestRisk** — största risken
- **energyWarning** — genuine / distraction / neutral
- **coachComment** — max 2 meningar AI-coaching
- **nextActionSuggestion** — konkret nästa steg
- **whyThisMatters** — koppling till dina mål

Använder **ephemeral prompt cache** på system-prompten (~20 % kostnadsbesparing) och får dina **brands + goals** som kontext.

### Claude Vision (`claude-vision.js`)

Läser bilder → svensk 3-meningars sammanfattning → blir transcript som du sen kan analysera.

### Weekly Review (`weekly-review.js`)

Analyserar alla aktiva idéer (Inbox + Next, ej blockerade) → returnerar: week insight, fastest revenue path, top 3 + reasoning, overdue-varning.

### Research (smart routing)

- **Smart validering** (`research-validate.js`) — Exa semantic search + Claude-syntes. ~3–4 s, ~2 öre
- **Triple-check** (`research-triple-check.js`) — Exa + Perplexity + Claude web_search parallellt. ~6–10 s, ~5–10 öre
- **Enskilda providers** — `research-exa`, `research-perplexity`, `research-claude-search` direkt

---

## Idé-objektet (fält)

```
id, transcript, status, brand, deadline, notes
aiAnalysis: { summary, ice, energyScore, potentialScore, tags,
              pros, cons, biggestRisk, energyWarning, coachComment,
              nextActionSuggestion, whyThisMatters }
manualScores        // dina överskrivningar
dependsOn[]         // blockeringar
validation          // research-resultat
notionUrl, notionSyncedAt
googleEventId, googleEventLink
createdAt, updatedAt
```

**Status-flöde:** Inbox → Next Action → Inkubera / Parkera / Klar

---

## Externa integrationer

| Integration | Vad |
|---|---|
| **Notion** | Push idé med alla fält till Notion-databas, upsert via "IdeaDump ID", skapar blocks med summary/coach/risk/pros/cons |
| **Google Calendar** | OAuth → token i Supabase → "Boka"-knapp skapar event direkt (09:00–10:00 på deadline eller idag). Fallback till .ics om det failar |
| **Resend email** | HTML-formatterad söndagsrapport till `lillen75@gmail.com` |
| **Web Push** | Subscription per device, cron skickar push vid deadlines |
| **ICS export** | .ics-fil för enskild idé (manuell kalender-import) |
| **CSV export** | Alla idéer som spreadsheet från Inställningar |

---

## Schemalagda jobb (Netlify cron)

- **Söndagsgenomgång** — varje söndag 17:00 UTC. Kör weekly review, mailar HTML-rapport
- **Deadline-check** — varje morgon 07:00 UTC. Kollar overdue / due today / due soon → push-notis

---

## Inställningar (varje toggle)

- Varumärken (namn + färg, påverkar AI-analys och Notion)
- Mål (textarea — Claude får det som kontext för ICE-viktning)
- Google Calendar connect/disconnect
- Push-notiser subscribe/test/unsubscribe
- CSV-export
- Statistik (antal, Inbox/Next/Done)
- Rensa alla idéer (destruktivt)

---

## Auth & cloud sync

- **Supabase Auth** med Google OAuth + email/lösenord. Beta-godkännande krävs.
- **`ideadump_user_data`** — JSON-snapshot av idé-arrayen per user
- **Migrering** — första inloggning flyttar localStorage-idéer till moln
- **Offline-capture** — inspelning/transkribering fungerar offline, synkar till moln vid reconnect

---

## PWA

- Installerbar på hemskärmen (manifest.json, dark theme #02020e, cyan #00F0FF)
- Service worker cachar assets för offline
- Bottom-nav med safe-area-inset för iPhone
- **iOS PWA-begränsning:** Google-login funkar inte i installerad app (visar "öppna i Safari"-meddelande); e-post/lösenord funkar

---

## Mindre uppenbara möjligheter

- **Dependencies** — idéer kan blockera varandra (`dependsOn[]`), Weekly Review döljer blockerade
- **Coach-varningar** — AI flaggar automatiskt distraktioner, timing-mismatch, idékrockar
- **Energy vs Impact** — separata axlar så du kan skilja hög-potential-men-drainande från genuina wins
- **Brand-filtrerad analys** — Claude vet om dina varumärken och taggar/sorterar mot dem
- **Manuell override** — du kan skriva över AI:ns ICE-scoring via `manualScores`
- **Overdue-tracking** — Weekly Review highlightar röda, deadline-cron pushar proaktivt
