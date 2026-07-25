#!/usr/bin/env bash
#
# Optional — puts real data behind the app.
#
# A fresh DAO has an empty registry, so the app shows an empty directory. This
# script drives the genuine governance flow against the running chain for a few
# universities: apply -> a ministry proposes -> three ministries vote For ->
# queue -> wait out the timelock -> execute. Nothing is faked; the universities
# end up accredited because the DAO voted them in.
#
# Uses anvil's default accounts: #1-#5 are the founding ministries, #6-#8 stand
# in for universities. Run ./1-start-chain.sh first.
#
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

need cast "Install Foundry: https://getfoundry.sh"
need node "Install Node.js: https://nodejs.org"
require_deployment

REGISTRY="$(json_field "$DEPLOYMENT_JSON" registry)"
GOVERNOR="$(json_field "$DEPLOYMENT_JSON" governor)"

# anvil's deterministic accounts.
MINISTRY_1=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
MINISTRY_2=0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
MINISTRY_3=0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6

# university: <private key>|<name>|<ISO country>|<ed25519 public key>
UNIVERSITIES=(
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e|University of Canterbury|NZ|0xd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356|Technical University of Munich|DE|0xfc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025"
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97|University of Nairobi|KE|0x602621cfe073bf3deeb4387860f6c4ef6ac74d624edbf8f7f7d2b0fa383dff55"
)

# The governor's voting/timelock settings, so we know how far to fast-forward.
VOTING_PERIOD="$(cast call "$GOVERNOR" 'votingPeriod()(uint256)' --rpc-url "$RPC_URL" | cut -d' ' -f1)"
TIMELOCK="$(cast call "$GOVERNOR" 'timelock()(address)' --rpc-url "$RPC_URL")"
MIN_DELAY="$(cast call "$TIMELOCK" 'getMinDelay()(uint256)' --rpc-url "$RPC_URL" | cut -d' ' -f1)"

send() { cast send --rpc-url "$RPC_URL" --private-key "$1" "${@:2}" >/dev/null; }

bold "Seeding ${#UNIVERSITIES[@]} universities through the DAO"
info "registry: ${REGISTRY}"
info "governor: ${GOVERNOR}  (votingPeriod ${VOTING_PERIOD} blocks, timelock ${MIN_DELAY}s)"
echo

for entry in "${UNIVERSITIES[@]}"; do
  IFS='|' read -r UNI_KEY UNI_NAME UNI_COUNTRY UNI_PUBKEY <<< "$entry"
  UNI_ADDR="$(cast wallet address --private-key "$UNI_KEY")"

  bold "${UNI_NAME} (${UNI_ADDR})"

  info "applying for accreditation..."
  send "$UNI_KEY" "$REGISTRY" \
    'submitApplication(string,string,string,bytes)' \
    "$UNI_NAME" "$UNI_COUNTRY" "ed25519" "$UNI_PUBKEY"

  info "a ministry opens the resolution vote..."
  PROPOSE_RECEIPT="$(cast send --rpc-url "$RPC_URL" --private-key "$MINISTRY_1" --json \
    "$GOVERNOR" 'proposeAccreditation(address)' "$UNI_ADDR")"
  PROPOSE_BLOCK="$(node -e "process.stdout.write(String(parseInt(JSON.parse(process.argv[1]).blockNumber, 16)))" "$PROPOSE_RECEIPT")"

  PROPOSAL_ID="$(cast call "$GOVERNOR" 'accreditationProposalId(address)(uint256)' "$UNI_ADDR" --rpc-url "$RPC_URL" | cut -d' ' -f1)"

  # The governor builds this description itself, embedding the propose block so
  # re-applications get a fresh proposal id. queue/execute must reproduce it exactly.
  DESCRIPTION="Resolve accreditation application of $(echo "$UNI_ADDR" | tr '[:upper:]' '[:lower:]') [block ${PROPOSE_BLOCK}]"
  DESC_HASH="$(cast keccak "$DESCRIPTION")"
  CALLDATA="$(cast calldata 'resolveApplication(address)' "$UNI_ADDR")"

  info "three ministries vote For..."
  send "$MINISTRY_1" "$GOVERNOR" 'castVote(uint256,uint8)' "$PROPOSAL_ID" 1
  send "$MINISTRY_2" "$GOVERNOR" 'castVote(uint256,uint8)' "$PROPOSAL_ID" 1
  send "$MINISTRY_3" "$GOVERNOR" 'castVote(uint256,uint8)' "$PROPOSAL_ID" 1

  info "fast-forwarding past the voting deadline..."
  cast rpc --rpc-url "$RPC_URL" anvil_mine "$(printf '0x%x' $((VOTING_PERIOD + 1)))" >/dev/null

  info "queueing into the timelock..."
  send "$MINISTRY_1" "$GOVERNOR" \
    'queue(address[],uint256[],bytes[],bytes32)' \
    "[${REGISTRY}]" "[0]" "[${CALLDATA}]" "$DESC_HASH"

  info "waiting out the timelock delay..."
  cast rpc --rpc-url "$RPC_URL" evm_increaseTime "$((MIN_DELAY + 1))" >/dev/null
  cast rpc --rpc-url "$RPC_URL" evm_mine >/dev/null

  info "executing..."
  send "$MINISTRY_1" "$GOVERNOR" \
    'execute(address[],uint256[],bytes[],bytes32)' \
    "[${REGISTRY}]" "[0]" "[${CALLDATA}]" "$DESC_HASH"

  ACCREDITED="$(cast call "$REGISTRY" 'isAccredited(address)(bool)' "$UNI_ADDR" --rpc-url "$RPC_URL")"
  [ "$ACCREDITED" = "true" ] || die "${UNI_NAME} did not end up accredited"
  info "accredited ✓"
  echo
done

bold "Done — $(cast call "$REGISTRY" 'applicantCount()(uint256)' --rpc-url "$RPC_URL" | cut -d' ' -f1) applicants, all accredited."
info "Refresh the app, or: curl http://localhost:5000/api/universities"
info "To issue a degree, connect one of the university accounts in MetaMask, e.g."
info "  $(cast wallet address --private-key "$(echo "${UNIVERSITIES[0]}" | cut -d'|' -f1)")"
