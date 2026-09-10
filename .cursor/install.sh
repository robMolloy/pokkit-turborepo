#!/usr/bin/env bash
# Idempotent bootstrap for the pokkit-turborepo Cloud Agent environment.
# Safe to run repeatedly (used as the environment `install` step).
set -euo pipefail

# Resolve repo root (this script lives in <repo>/.cursor).
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Installing workspace dependencies (pnpm)"
# Linux Tailwind oxide + other native binaries are pulled in via .npmrc
# supportedArchitectures, so a plain frozen install is sufficient.
pnpm install --frozen-lockfile

echo "==> Warming the Go toolchain and building the pokkit-whisper PocketBase backend"
# go.mod pins go 1.27.0 with GOTOOLCHAIN=auto, so this also downloads the
# matching toolchain on a fresh machine. The committed
# apps/pokkit-whisper-db/app-db is a macOS arm64 binary and pokkit-whisper-db
# has no local Go entrypoint, so we build the shared PocketBase runner for linux.
go build -o apps/pokkit-whisper-db/app-db-linux ./packages/pokkit-testing/pocketbase

echo "==> Seeding a writable dev copy of the PocketBase data"
# Keeps the git-tracked pb_data clean while giving the running server a
# writable database pre-loaded with the app's collections and demo data.
if [ ! -d apps/pokkit-whisper-db/pb_data_dev ]; then
  cp -r apps/pokkit-whisper-db/pb_data apps/pokkit-whisper-db/pb_data_dev
fi

echo "==> Writing pokkit-whisper frontend .env (if missing)"
# pokkit-whisper validates these VITE_* vars at startup (src/config/envConfig.ts).
if [ ! -f apps/pokkit-whisper/.env ]; then
  cat > apps/pokkit-whisper/.env <<'EOF'
VITE_APP_BASE_URL=/
VITE_POCKETBASE_URL=http://127.0.0.1:8090
VITE_APP_NAME=pokkit-whisper
VITE_APP_DISPLAY_NAME=Pokkit Whisper
EOF
fi

echo "==> Environment bootstrap complete"
