#!/usr/bin/env bash
# Shared helpers for start-all.sh and seed-demo.sh. Not meant to be run directly.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Ensure Foundry binaries are on PATH (installed via foundryup to ~/.foundry/bin)
if [ -d "$HOME/.foundry/bin" ]; then
  export PATH="$HOME/.foundry/bin:$PATH"
fi

ANVIL_PORT="${ANVIL_PORT:-8545}"
RPC_URL="${RPC_URL:-http://127.0.0.1:${ANVIL_PORT}}"
CHAIN_ID="${CHAIN_ID:-31337}"
DEPLOYMENT_JSON="${ROOT}/university-dao/deployments/${CHAIN_ID}.json"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
info() { printf '  %s\n' "$1"; }
die() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "$1 not found. $2"
}

# Reads a top-level string field out of the deployment JSON foundry writes.
json_field() {
  node -e "process.stdout.write(String(require('$1')['$2'] ?? ''))"
}

# Sets KEY=VALUE in an .env file, replacing the line if the key is already there.
set_env_var() {
  local file="$1" key="$2" value="$3" tmp
  touch "$file"
  tmp="$(mktemp)"
  KEY="$key" VALUE="$value" awk '
    BEGIN { key = ENVIRON["KEY"]; value = ENVIRON["VALUE"]; found = 0 }
    $0 ~ "^" key "=" { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "$file" > "$tmp" && mv "$tmp" "$file"
}

# npm install, but only when it has not been done yet.
ensure_deps() {
  local dir="$1"
  if [ ! -d "${dir}/node_modules" ]; then
    bold "Installing dependencies in $(basename "$dir")..."
    (cd "$dir" && npm install --no-audit --no-fund)
  fi
}

require_deployment() {
  [ -f "$DEPLOYMENT_JSON" ] || die "No DAO deployment found at ${DEPLOYMENT_JSON}. Run ./start-all.sh first."
  cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1 \
    || die "No chain reachable at ${RPC_URL}. Run ./start-all.sh first."
}
