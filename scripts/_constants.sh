#!/usr/bin/env bash
# Hårdkodade IDs för IdeaDump-projektets Google Workspace-integration.
# Skapade 2026-04-11 av Claude Code-setup. Se ideadump-notebooks-skillen för kontext.

# NotebookLM
export IDEADUMP_NOTEBOOK_ID="d6fcad4d-1d2c-496e-aac7-b793cb3f1b93"
export NOTEBOOKLM_LANGUAGE="sv"

# Google Drive — /IdeaDump/ struktur
export DRIVE_ROOT_ID="1yCItbuQiI58ZAdv_xgOpSlLCe7M_nfsL"
export DRIVE_VOICE_ID="1pI-xD3BJo1nhyg281wLPI62DGbMSp2df"
export DRIVE_SKETCHES_ID="1Xp6AY9gmP7fCaYqcs_NcYna73YqClDdK"
export DRIVE_SCREENSHOTS_ID="1mOCt8sdbcmT-YdexZqZq5MRpMPEzGw-c"
export DRIVE_DEEPDIVES_ID="1wh0DFhuIJupm4uYPMcePR5F4dKrPJCuY"
export DRIVE_REFERENCES_ID="1oF78iSc9D8FsAFuibm5wgEOawNgbDgIg"
export DRIVE_EXPORTS_ID="1xwcyhGgBn4WkFoE-ihkXDME-9c9kKx0f"

# Google Sheets — Master
export MASTER_SHEET_ID="1i-VaYHJ8j7f5d3pUuVvYqvcq6yqWR-IZGFEZVh2baWc"
export MASTER_SHEET_URL="https://docs.google.com/spreadsheets/d/${MASTER_SHEET_ID}/edit"

# Gmail — vart veckorapporten skickas
export REPORT_TO_EMAIL="lillen75@gmail.com"
export REPORT_FROM_NAME="IdeaDump Weekly"

# Verktyg
export NBLM="${HOME}/.local/bin/notebooklm"
# gws-priv är default config-dir, så bara `gws` räcker
export GWS="gws"
