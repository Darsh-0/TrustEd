#!/usr/bin/env bash
#
# Starts the entire stack in one command: chain + API + app.
# Ctrl-C stops everything.
#
#   ./start-all.sh              # start stack
#   ./start-all.sh --seed       # start stack + seed demo universities
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

SEED=false
if [[ "${1:-}" == "--seed" ]]; then
  SEED=true
fi

need anvil "Install Foundry: https://getfoundry.sh"
need forge "Install Foundry: https://getfoundry.sh"
need cast  "Install Foundry: https://getfoundry.sh"
need node  "Install Node.js: https://nodejs.org"

if cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  die "Something is already listening on ${RPC_URL}. Stop it, or run with ANVIL_PORT=8546."
fi

PIDS=()
cleanup() {
  bold "Shutting down..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if [ ! -f "${ROOT}/university-dao/lib/forge-std/src/Script.sol" ]; then
  bold "Fetching university-dao dependencies..."
  (cd "${ROOT}/university-dao" && forge install)
fi

bold "Starting anvil on port ${ANVIL_PORT}..."
anvil --port "$ANVIL_PORT" --chain-id "$CHAIN_ID" --silent &
PIDS+=($!)

for _ in $(seq 1 40); do
  cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1 && break
  sleep 0.25
done
cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1 || die "anvil did not come up on ${RPC_URL}"
info "anvil is up (pid ${PIDS[-1]})"

bold "Deploying the DAO..."
(cd "${ROOT}/university-dao" && forge script script/Deploy.s.sol --rpc-url "$RPC_URL" --broadcast)

REGISTRY="$(json_field "$DEPLOYMENT_JSON" registry)"
[ -n "$REGISTRY" ] || die "Deploy finished but no registry address in ${DEPLOYMENT_JSON}"

bold "Wiring .env files..."
set_env_var "${ROOT}/Project.Api/.env" UNIVERSITY_REGISTRY_ADDRESS "$REGISTRY"
set_env_var "${ROOT}/Project.Api/.env" RPC_URL "$RPC_URL"
set_env_var "${ROOT}/Project.App/.env" VITE_UNIVERSITY_REGISTRY_ADDRESS "$REGISTRY"
set_env_var "${ROOT}/Project.App/.env" VITE_RPC_URL "$RPC_URL"
set_env_var "${ROOT}/Project.App/.env" VITE_REGISTRY_CHAIN_ID "$CHAIN_ID"
info "UniversityRegistry: ${REGISTRY}"

ensure_deps "${ROOT}/Project.Api"
ensure_deps "${ROOT}/Project.App"

bold "Starting the API (port 5000)..."
(cd "${ROOT}/Project.Api" && npm run dev) &
PIDS+=($!)

bold "Starting the app (port 5173)..."
(cd "${ROOT}/Project.App" && npm run dev) &
PIDS+=($!)

echo
bold "Stack is running:"
info "  Chain:  ${RPC_URL} (chain ${CHAIN_ID})"
info "  API:    http://localhost:5000"
info "  App:    http://localhost:5173"
info "  Registry: ${REGISTRY}"
echo

if [ "$SEED" = true ]; then
  bold "Seeding demo universities..."
  "${ROOT}/seed-demo.sh"
  echo
fi

info "Ctrl-C to stop everything."
echo

wait
