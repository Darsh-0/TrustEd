#!/usr/bin/env bash
#
# Terminal 3 — the web app (http://localhost:5173).
#
# Lists the universities the DAO has accredited, and unlocks degree issuance for
# whichever accredited university's wallet you connect.
#
# Run ./1-start-chain.sh first.
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

need node "Install Node.js: https://nodejs.org"
need cast "Install Foundry: https://getfoundry.sh"

require_deployment
ensure_deps "${ROOT}/Project.App"

bold "Starting the web app..."
info "registry: $(json_field "$DEPLOYMENT_JSON" registry)"
info "point MetaMask at ${RPC_URL} (chain ${CHAIN_ID}) to connect a wallet"
echo

cd "${ROOT}/Project.App"
exec npm run dev
