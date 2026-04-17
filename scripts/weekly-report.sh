#!/usr/bin/env bash
# Generera veckorapport från Ideadump-notebooken och skicka som mail.
#
# Användning:
#   bash scripts/weekly-report.sh                # default: skicka mail
#   bash scripts/weekly-report.sh --no-mail      # bara generera + ladda ner

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_constants.sh"

SEND_MAIL=true
[[ "${1:-}" == "--no-mail" ]] && SEND_MAIL=false

WEEK=$(date +"%G-v%V")           # ISO-vecka, ex 2026-v15
DATE=$(date +"%Y-%m-%d")
OUT_DIR="$HOME/Documents/IdeaDump-Veckorapporter"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/ideadump-$WEEK.md"

echo "→ Genererar veckorapport för $WEEK ..."
$NBLM generate report \
  --format briefing-doc \
  --append "Skapa en svensk veckosammanställning av idéer i denna notebook. Gruppera per varumärke (HDL, Conversify, Life Is Awesome, Timeless Brick, Övrigt). För varje grupp: lyft fram de 1-3 starkaste idéerna, sammanfatta gemensamma teman, och föreslå en konkret nästa action. Avsluta med en kort 'highlights'-sektion på max 5 punkter över allt brand-övergripande." \
  --language "$NOTEBOOKLM_LANGUAGE" \
  --wait \
  -n "$IDEADUMP_NOTEBOOK_ID" >/dev/null

echo "→ Laddar ner till $OUT ..."
$NBLM download report "$OUT" -n "$IDEADUMP_NOTEBOOK_ID" >/dev/null

WORDS=$(wc -w < "$OUT")
echo "  ↳ $WORDS ord."

if ! $SEND_MAIL; then
  echo "✓ Klar (--no-mail). Rapporten finns på $OUT"
  exit 0
fi

echo "→ Bygger MIME-mail och skickar via gws ..."
RAW_B64=$(SUBJECT="IdeaDump veckorapport — $WEEK" \
          FROM_NAME="$REPORT_FROM_NAME" \
          TO="$REPORT_TO_EMAIL" \
          BODY_FILE="$OUT" \
          python3 - <<'PY'
import os, base64, email.mime.text, email.utils

with open(os.environ["BODY_FILE"], "r", encoding="utf-8") as f:
    body = f.read()

msg = email.mime.text.MIMEText(body, "plain", "utf-8")
msg["Subject"] = os.environ["SUBJECT"]
msg["To"] = os.environ["TO"]
msg["From"] = f'{os.environ["FROM_NAME"]} <{os.environ["TO"]}>'
msg["Date"] = email.utils.formatdate(localtime=True)
msg["Message-ID"] = email.utils.make_msgid(domain="ideadump.local")

raw = msg.as_bytes()
b64 = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
print(b64)
PY
)

$GWS gmail users messages send \
  --params '{"userId":"me"}' \
  --json "{\"raw\":\"$RAW_B64\"}" \
  >/dev/null

echo "✓ Mail skickat till $REPORT_TO_EMAIL"
echo "  Lokal kopia: $OUT"

# Logga till Sheet
NOW_DATE=$(date +"%Y-%m-%d %H:%M")
DOC_LINK="$OUT"
$GWS sheets spreadsheets values append \
  --params "{\"spreadsheetId\":\"$MASTER_SHEET_ID\",\"range\":\"Veckorapporter!A2\",\"valueInputOption\":\"RAW\",\"insertDataOption\":\"INSERT_ROWS\"}" \
  --json "{\"values\":[[\"$WEEK\",\"$NOW_DATE\",\"\",\"\",\"$DOC_LINK\"]]}" \
  >/dev/null 2>&1 || echo "  (kunde inte logga till Sheet — fortsätter)"
