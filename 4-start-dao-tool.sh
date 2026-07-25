#!/usr/bin/env bash
#
# Terminal 4 — the DAO playground tool (http://localhost:5174).
#
# The governance side of the system: switch between ministry / university /
# observer roles, drive the full lifecycle (apply, propose, vote, queue, warp,
# execute), and watch every event land in a decoded activity feed. It signs with
# anvil's dev keys, so no wallet extension is needed.
#
# This is deliberately separate from Project.App — the app only ever reads the
# DAO's verdict; everything that *makes* that verdict lives here.
#
# Run ./1-start-chain.sh first.
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

TOOL_DIR="${ROOT}/university-dao-tool"

need node "Install Node.js: https://nodejs.org"
need cast "Install Foundry: https://getfoundry.sh"

require_deployment
ensure_deps "$TOOL_DIR"

# Point the tool at whatever ./1-start-chain.sh actually deployed, rather than
# relying on the deterministic-address defaults baked into src/lib/contracts.ts.
bold "Wiring the tool to the deployed DAO..."
for pair in "VITE_TIMELOCK_ADDRESS:timelock" \
            "VITE_MEMBERSHIP_ADDRESS:membership" \
            "VITE_REGISTRY_ADDRESS:registry" \
            "VITE_GOVERNOR_ADDRESS:governor"; do
  set_env_var "${TOOL_DIR}/.env" "${pair%%:*}" "$(json_field "$DEPLOYMENT_JSON" "${pair##*:}")"
done
set_env_var "${TOOL_DIR}/.env" VITE_RPC_URL "$RPC_URL"
info "governor: $(json_field "$DEPLOYMENT_JSON" governor)"
info "registry: $(json_field "$DEPLOYMENT_JSON" registry)"

echo
bold "Starting the DAO tool on http://localhost:5174"
info "roles: observer, ministries (anvil #1-#5), universities (anvil #6-#7)"
info "anvil only mines on transactions — use the chain controls in the sidebar"
info "to push past voting periods and the timelock delay."
info "if it shows stale addresses, clear them under ⚙ connection (the settings"
info "panel remembers what you last saved, and that wins over this .env)."
echo

cd "$TOOL_DIR"
exec npm run dev
