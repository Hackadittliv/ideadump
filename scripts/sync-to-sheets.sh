#!/usr/bin/env bash
# Synka IdeaDump-idéer från en JSON-fil till Master Sheet (flik "Idéer").
#
# Användning:
#   bash scripts/sync-to-sheets.sh ideas.json     # från fil
#   cat ideas.json | bash scripts/sync-to-sheets.sh -   # från stdin
#
# JSON-format: en array av idé-objekt enligt IdeaDumps localStorage-shape.
# Ex: [{"id":"...","createdAt":"...","brand":"HDL","status":"inbox",
#       "transcript":"...","aiAnalysis":{"summary":"...","ice":{...}},
#       "manualScores":null,"notes":""}, ...]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_constants.sh"

INPUT="${1:-ideas.json}"
if [[ "$INPUT" == "-" ]]; then
  INPUT=/dev/stdin
fi

if [[ "$INPUT" != "/dev/stdin" && ! -f "$INPUT" ]]; then
  echo "Fel: hittar inte $INPUT" >&2
  echo "Tips: exportera localStorage-värdet 'ideadump_ideas' till en fil först." >&2
  exit 1
fi

echo "→ Bygger rader från $INPUT ..."

# Bygg värden via python3 (säker JSON-hantering, inga shell-kvotnings-buggar)
VALUES_JSON=$(python3 - "$INPUT" <<'PY'
import json, sys, datetime

with open(sys.argv[1], "r", encoding="utf-8") as f:
    ideas = json.load(f)

if not isinstance(ideas, list):
    print("Fel: JSON-roten måste vara en array av idéer.", file=sys.stderr)
    sys.exit(1)

now = datetime.datetime.now().isoformat(timespec="seconds")

def date_sv(iso):
    try:
        return datetime.datetime.fromisoformat(iso.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except Exception:
        return iso or ""

def ice_total(idea):
    s = idea.get("manualScores") or (idea.get("aiAnalysis") or {}).get("ice") or {}
    try:
        return round((float(s.get("impact", 0)) + float(s.get("confidence", 0)) + float(s.get("ease", 0))) / 3, 2)
    except Exception:
        return ""

rows = []
for idea in ideas:
    ai = idea.get("aiAnalysis") or {}
    scores = idea.get("manualScores") or ai.get("ice") or {}
    rows.append([
        idea.get("id", ""),
        date_sv(idea.get("createdAt", "")),
        idea.get("brand", ""),
        idea.get("status", ""),
        ai.get("summary") or (idea.get("transcript", "")[:100]),
        ice_total(idea),
        scores.get("impact", ""),
        scores.get("confidence", ""),
        scores.get("ease", ""),
        (idea.get("manualScores") or {}).get("energy") or ai.get("energyScore", ""),
        ai.get("potentialScore", ""),
        ", ".join(ai.get("tags") or []),
        ai.get("nextActionSuggestion", ""),
        (idea.get("notes") or "").replace("\n", " "),
        (idea.get("transcript") or "").replace("\n", " "),
        now,
    ])

print(json.dumps({"values": rows}))
PY
)

ROW_COUNT=$(echo "$VALUES_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['values']))")
echo "→ Hittade $ROW_COUNT idéer."

if [[ "$ROW_COUNT" -eq 0 ]]; then
  echo "Inga rader att synka. Avslutar."
  exit 0
fi

echo "→ Rensar gamla rader (rad 2 och nedåt) ..."
$GWS sheets spreadsheets values clear \
  --params "{\"spreadsheetId\":\"$MASTER_SHEET_ID\",\"range\":\"Idéer!A2:P\"}" \
  >/dev/null

echo "→ Skriver $ROW_COUNT rader till Idéer-fliken ..."
$GWS sheets spreadsheets values append \
  --params "{\"spreadsheetId\":\"$MASTER_SHEET_ID\",\"range\":\"Idéer!A2\",\"valueInputOption\":\"RAW\",\"insertDataOption\":\"INSERT_ROWS\"}" \
  --json "$VALUES_JSON" \
  >/dev/null

echo "✓ Klar. Visa resultatet: $MASTER_SHEET_URL"
