#!/usr/bin/env bash
#
# Terminal 1 — the chain.
#
# Starts a local anvil node, deploys the University Accreditation DAO onto it,
# and writes the resulting registry address into Project.Api/.env and
# Project.App/.env so the other two terminals pick it up automatically.
#
# Leave this running. Ctrl-C stops the node (and wipes its state — the DAO is
# redeployed fresh every time you run this).
#
#   ./1-start-chain.sh
#   ANVIL_PORT=8546 ./1-start-chain.sh    # if 8545 is taken
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

need anvil "Install Foundry: https://getfoundry.sh"
need forge "Install Foundry: https://getfoundry.sh"
need cast  "Install Foundry: https://getfoundry.sh"
need node  "Install Node.js: https://nodejs.org"

if cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  die "Something is already listening on ${RPC_URL}. Stop it, or run with ANVIL_PORT=8546."
fi

# forge-std and openzeppelin-contracts are committed under university-dao/lib, so
# this normally does nothing — it only kicks in on a checkout that is missing them.
if [ ! -f "${ROOT}/university-dao/lib/forge-std/src/Script.sol" ]; then
  bold "Fetching university-dao dependencies..."
  (cd "${ROOT}/university-dao" && forge install)
fi

bold "Starting anvil on port ${ANVIL_PORT}..."
anvil --port "$ANVIL_PORT" --chain-id "$CHAIN_ID" --silent &
ANVIL_PID=$!
trap 'kill $ANVIL_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1 && break
  sleep 0.25
done
cast block-number --rpc-url "$RPC_URL" >/dev/null 2>&1 || die "anvil did not come up on ${RPC_URL}"
info "anvil is up (pid ${ANVIL_PID})"

bold "Deploying the DAO..."
(cd "${ROOT}/university-dao" && forge script script/Deploy.s.sol --rpc-url "$RPC_URL" --broadcast)

REGISTRY="$(json_field "$DEPLOYMENT_JSON" registry)"
[ -n "$REGISTRY" ] || die "Deploy finished but no registry address in ${DEPLOYMENT_JSON}"

bold "Wiring Project.Api and Project.App to the DAO registry..."
set_env_var "${ROOT}/Project.Api/.env" UNIVERSITY_REGISTRY_ADDRESS "$REGISTRY"
set_env_var "${ROOT}/Project.Api/.env" RPC_URL "$RPC_URL"
set_env_var "${ROOT}/Project.App/.env" VITE_UNIVERSITY_REGISTRY_ADDRESS "$REGISTRY"
set_env_var "${ROOT}/Project.App/.env" VITE_RPC_URL "$RPC_URL"
set_env_var "${ROOT}/Project.App/.env" VITE_REGISTRY_CHAIN_ID "$CHAIN_ID"
info "UniversityRegistry: ${REGISTRY}"
info "Project.Api/.env and Project.App/.env updated"

echo
bold "Chain is ready. Leave this terminal running."
info "Next, in other terminals:"
info "  ./2-start-api.sh    (the accreditation API, port 5000)"
info "  ./3-start-app.sh    (the web app, port 5173)"
info "  ./seed-demo.sh      (optional — vote a few universities through so the app isn't empty)"
echo

wait $ANVIL_PID
