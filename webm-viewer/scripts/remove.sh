#!/usr/bin/env bash
# ============================================================
# remove.sh — Uninstall the extension from the local VS Code installation.
#
# Reads publisher and name from package.json automatically.
#
# Usage:
#   bash scripts/remove.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Build extension ID from package.json (no jq required)
EXT_ID=$(node -e "
  const p = require('$ROOT/package.json');
  console.log(p.publisher + '.' + p.name);
")

if command -v code &>/dev/null; then
  CODE_CMD="code"
elif [ -f "/c/Program Files/Microsoft VS Code/bin/code" ]; then
  CODE_CMD="/c/Program Files/Microsoft VS Code/bin/code"
else
  echo "ERROR: Could not find the 'code' CLI." >&2
  exit 1
fi

echo "==> Uninstalling extension: $EXT_ID"
"$CODE_CMD" --uninstall-extension "$EXT_ID"
echo "==> Done. Restart VS Code to complete uninstallation."
