#!/usr/bin/env bash
# ============================================================
# publish.sh — Build and publish the extension to the VS Code Marketplace.
#
# Prerequisites:
#   1. Register a publisher at https://marketplace.visualstudio.com/manage
#   2. Replace PLACEHOLDER_PUBLISHER in package.json with your publisher ID.
#   3. Create a Personal Access Token (PAT) at:
#      https://dev.azure.com/<your-org>/_usersSettings/tokens
#      Required scope: Marketplace > Publish
#   4. Set VSCE_PAT in your environment before running:
#      export VSCE_PAT="<your-pat>"
#
# Usage:
#   VSCE_PAT=<token> bash scripts/publish.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "${VSCE_PAT:-}" ]; then
  echo "ERROR: VSCE_PAT environment variable is not set." >&2
  echo "  export VSCE_PAT=<your-azure-devops-pat>" >&2
  echo "  Then re-run: VSCE_PAT=<token> bash scripts/publish.sh" >&2
  exit 1
fi

cd "$ROOT"

echo "==> Building for production..."
node esbuild.js --production

echo "==> Publishing to VS Code Marketplace..."
npx @vscode/vsce publish --pat "$VSCE_PAT"

echo "==> Published successfully."
