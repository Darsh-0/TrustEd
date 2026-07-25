#!/usr/bin/env bash
#
# Terminal 2 — the accreditation API (http://localhost:5000).
#
# Reads the DAO's UniversityRegistry and serves it over HTTP:
#   GET /api/universities                        the accredited directory
#   GET /api/universities/:address               one institution's record
#   GET /api/universities/:address/accredited    the issuing gate
#
# Run ./1-start-chain.sh first.
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

need node "Install Node.js: https://nodejs.org"
need cast "Install Foundry: https://getfoundry.sh"

require_deployment
ensure_deps "${ROOT}/Project.Api"

bold "Starting the accreditation API..."
info "registry: $(json_field "$DEPLOYMENT_JSON" registry)"
info "try: curl http://localhost:5000/api/universities"
echo

cd "${ROOT}/Project.Api"
exec npm run dev
