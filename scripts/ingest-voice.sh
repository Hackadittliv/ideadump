#!/usr/bin/env bash
# Hitta nya audio-filer i /IdeaDump/01-voice-originals/ och importera dem
# till NotebookLM "Ideadump"-notebooken. Idempotent: identifierar redan
# importerade filer via Drive-file-ID inbäddat i source title.
#
# Användning:
#   bash scripts/ingest-voice.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/_constants.sh"

# gws sandboxar alla filsökvägar till CWD — vi måste tvinga CWD till
# projektroten och lägga temp-filer där (gitignored).
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$PROJECT_ROOT"
WORK_DIR=".ingest-tmp"
mkdir -p "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "→ Hämtar redan importerade Drive-IDs från NotebookLM ..."
ALREADY_JSON=$($NBLM source list -n "$IDEADUMP_NOTEBOOK_ID" --json 2>&1 | sed -n '/^{/,$p')
ALREADY_IDS=$(echo "$ALREADY_JSON" | python3 -c "
import sys, json, re
d = json.load(sys.stdin)
ids = []
for s in d.get('sources', []):
    m = re.search(r'\\[drive:([A-Za-z0-9_-]+)\\]', s.get('title') or '')
    if m: ids.append(m.group(1))
print('\n'.join(ids))
")
ALREADY_COUNT=$(echo -n "$ALREADY_IDS" | grep -c . || true)
echo "  ↳ $ALREADY_COUNT redan importerade."

echo "→ Listar audio-filer i /IdeaDump/01-voice-originals/ ..."
DRIVE_LIST=$($GWS drive files list \
  --params "{\"q\":\"'$DRIVE_VOICE_ID' in parents and trashed=false and (mimeType contains 'audio/' or mimeType contains 'video/')\",\"fields\":\"files(id,name,mimeType,size,createdTime)\",\"pageSize\":1000}" \
  2>&1 | sed -n '/^{/,$p')

DRIVE_COUNT=$(echo "$DRIVE_LIST" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('files', [])))")
echo "  ↳ $DRIVE_COUNT filer i Drive-mappen."

# Bestäm vad som ska importeras
TO_PROCESS=$(echo "$DRIVE_LIST" | ALREADY="$ALREADY_IDS" python3 -c "
import sys, json, os
d = json.load(sys.stdin)
already = set((os.environ.get('ALREADY') or '').split('\n'))
to_do = [f for f in d.get('files', []) if f['id'] not in already]
print(json.dumps(to_do))
")

NEW_COUNT=$(echo "$TO_PROCESS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
echo "→ $NEW_COUNT nya filer att importera."

if [[ "$NEW_COUNT" -eq 0 ]]; then
  echo "✓ Inget nytt. Klar."
  exit 0
fi

LOG_ROWS="["
i=0
echo "$TO_PROCESS" | python3 -c "
import sys, json
for f in json.load(sys.stdin):
    print('\t'.join([f['id'], f['name'], f.get('mimeType','application/octet-stream'), str(f.get('size','0'))]))
" | while IFS=$'\t' read -r FID FNAME FMIME FSIZE; do
  i=$((i+1))
  echo
  echo "[$i/$NEW_COUNT] $FNAME ($FSIZE bytes)"

  LOCAL="$WORK_DIR/$FNAME"
  echo "  ↓ laddar ner från Drive ..."
  $GWS drive files get \
    --params "{\"fileId\":\"$FID\",\"alt\":\"media\"}" \
    --output "$LOCAL" >/dev/null 2>&1

  TITLE="voice: $FNAME [drive:$FID]"
  echo "  ↑ laddar upp till NotebookLM ..."
  # Obs: NotebookLM ignorerar --title för MEDIA-källor och använder filnamnet.
  # Vi sätter titeln med 'source rename' efter upload istället.
  ADD_OUT=$($NBLM source add "$LOCAL" --type file --mime-type "$FMIME" -n "$IDEADUMP_NOTEBOOK_ID" 2>&1 || echo "ERROR")

  SOURCE_ID=$(echo "$ADD_OUT" | grep -oE 'Added source: [a-f0-9-]+' | awk '{print $3}')
  if [[ -z "$SOURCE_ID" ]]; then
    echo "  ✗ misslyckades att lägga till. Output:"
    echo "$ADD_OUT" | sed 's/^/    /'
    STATUS="failed"
  else
    echo "  ⏳ väntar på processering ($SOURCE_ID) ..."
    if $NBLM source wait "$SOURCE_ID" -n "$IDEADUMP_NOTEBOOK_ID" --timeout 600 >/dev/null 2>&1; then
      echo "  ✏  döper om till \"$TITLE\" ..."
      $NBLM source rename "$SOURCE_ID" "$TITLE" -n "$IDEADUMP_NOTEBOOK_ID" >/dev/null 2>&1 || \
        echo "  (varning: rename misslyckades — idempotens fungerar då inte för just denna fil)"
      echo "  ✓ klar och transkriberad"
      STATUS="ready"
    else
      echo "  ⚠ processering misslyckades eller timed out"
      STATUS="processing_failed"
    fi
  fi

  # Logga till Sheet (en rad i taget — säker men långsam)
  NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  $GWS sheets spreadsheets values append \
    --params "{\"spreadsheetId\":\"$MASTER_SHEET_ID\",\"range\":\"Voice ingest log!A2\",\"valueInputOption\":\"RAW\",\"insertDataOption\":\"INSERT_ROWS\"}" \
    --json "{\"values\":[[\"$FID\",\"$FNAME\",\"$FSIZE\",\"$NOW\",\"${SOURCE_ID:-}\",\"$STATUS\"]]}" \
    >/dev/null 2>&1 || echo "  (kunde inte logga till Sheet — fortsätter)"

  rm -f "$LOCAL"
done

echo
echo "✓ Klar. $NEW_COUNT filer behandlade."
echo "  Notebook: https://notebooklm.google.com/notebook/$IDEADUMP_NOTEBOOK_ID"
echo "  Logg:     $MASTER_SHEET_URL"
