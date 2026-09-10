#!/usr/bin/env bash
set -euo pipefail

# Idempotent Cloud Agent bootstrap for the pokkit-turborepo monorepo.
# Runs after the repository is checked out. Keep this safe to re-run.

cd "$(dirname "$0")/.."

# 1. Install the pnpm workspace dependencies (Node/TS apps + tooling).
#    --frozen-lockfile keeps installs deterministic against pnpm-lock.yaml.
pnpm install --frozen-lockfile

# 2. Warm the Go build/module cache (and validate the Go toolchain) by
#    compiling the pokkit-starter PocketBase backend from source. This makes
#    later `go run`/tests start quickly.
(cd apps/pokkit-starter/pokkit-starter-db && go build -o build/app-db ./src/...)

# 3. Provide a local dev .env for the pokkit-starter UI (gitignored) so the
#    Vite dev server can reach the local PocketBase backend on port 8091.
ui_env="apps/pokkit-starter/pokkit-starter-ui/.env"
if [ ! -f "$ui_env" ]; then
  cat > "$ui_env" <<'EOF'
VITE_APP_BASE_URL=/
VITE_POCKETBASE_URL=http://127.0.0.1:8091
VITE_APP_NAME=pokkit-starter
VITE_APP_DISPLAY_NAME=Pokkit Starter
EOF
fi
