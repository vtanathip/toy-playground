#!/usr/bin/env bash
# ============================================================
# test.sh — Build and launch the extension in Extension Development Host
#
# Usage:
#   bash scripts/test.sh              # builds then opens dev host
#   bash scripts/test.sh --no-build   # skips build step
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Locate the 'code' CLI
if command -v code &>/dev/null; then
  CODE_CMD="code"
elif [ -f "/c/Program Files/Microsoft VS Code/bin/code" ]; then
  CODE_CMD="/c/Program Files/Microsoft VS Code/bin/code"
else
  echo "ERROR: Could not find the 'code' CLI. Add VS Code to your PATH." >&2
  exit 1
fi

if [[ "${1:-}" != "--no-build" ]]; then
  echo "==> Building extension..."
  cd "$ROOT"
  npm run compile
fi

echo "==> Launching Extension Development Host..."
"$CODE_CMD" --extensionDevelopmentPath="$ROOT" .

echo "==> Done. Open a .webm file in the Extension Development Host to test."
