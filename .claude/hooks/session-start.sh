#!/bin/bash
# Installs npm deps in Claude Code cloud sessions so lint, typecheck, tests
# and the pinned Supabase / Vercel CLIs (devDependencies) work immediately.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund

# Put node_modules/.bin on PATH so `supabase` and `vercel` work without npx.
echo "export PATH=\"$CLAUDE_PROJECT_DIR/node_modules/.bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"

# Node's built-in fetch ignores HTTPS_PROXY unless told otherwise. Without this, server code
# (Supabase, Groq) and scripts/db-migrate.mjs can't reach the network in a cloud sandbox.
echo 'export NODE_USE_ENV_PROXY=1' >> "$CLAUDE_ENV_FILE"
