# University Accreditation DAO

A DAO whose members are **national education ministries**, governing a public, on-chain **registry of accredited universities** — where each university publishes **its own public key**.

Anyone — a diploma verifier, a registrar, an employer — can read the registry for free with an `eth_call`. No wallet, no gas, no permission.

Two properties this system refuses to compromise on:

1. **Universities self-publish their keys.** The DAO never generates, holds, or edits key material — it only approves or rejects what a university submitted from its own address. Application is permissionless; approval is not.
2. **One ministry, one vote.** Voting power is membership (a soulbound NFT), not stake. Nobody can buy influence.

## Architecture

```
                          propose / castVote
  Ministries ───────────────────────────────────► AccreditationGovernor
  (soulbound ERC721Votes:                              │
   one token == one vote,                              │ queue / execute
   auto-delegated on mint)                             ▼
                                              TimelockController
                                              (the DAO's only hands)
                                                │ owns          │ owns
                                ┌───────────────┘               └──────────────┐
                                ▼                                              ▼
                       MinistryMembership                             UniversityRegistry
                       inviteMinistry()                               accredit()
                       revokeMembership()                             discredit(reason)
                                                                      rejectApplication()
                                                                      approveKeyRotation()
                                                                               ▲
  Universities ── submitApplication(key) / requestKeyRotation(key) ────────────┤  permissionless,
                                                                               │  msg.sender is identity
  Anyone ──────── isAccredited() / publicKeyOf() / getUniversity() ────────────┘  free eth_call
```

After deployment **no EOA holds any privileged role anywhere in the system.** The deploy script seeds the founding ministries, hands ownership of everything to the timelock, renounces its own timelock admin role, and asserts all of that before it exits. Every state change from then on requires a passed proposal: propose → vote (quorum of members, majority For) → queue → timelock delay → execute.

| Contract | Role |
|---|---|
| `MinistryMembership` | Soulbound `ERC721Votes` — the electorate. Mint/burn only by the DAO; transfers always revert. Self-delegates on mint so a new ministry can vote immediately. |
| `UniversityRegistry` | The product. Universities apply from their own address with opaque key bytes; only executed proposals move them between `Pending → Accredited → Revoked`. Key rotation is staged by the university and inert until the DAO approves it. |
| `AccreditationGovernor` | OZ Governor v5 (settings + simple counting + votes + timelock control) with an **absolute member-count quorum** (default 3) that governance itself can amend via `setQuorum`. `proposalThreshold = 1`: any member may propose. |
| `TimelockController` | Owner of the token and the registry. Only the governor may propose/cancel; anyone may execute a matured operation. |

> **Playground UI:** an interactive frontend (role-switcher, live on-chain activity feed, chain-time controls) lives in [`../university-dao-frontend`](../university-dao-frontend/) — `npm install && npm run dev` there once this repo is deployed to a local anvil.

## Quickstart

Requires [Foundry](https://getfoundry.sh).

```bash
forge install   # if lib/ is not already populated
forge build
```

### One-command demo

```bash
forge script script/DemoFlow.s.sol
```

Self-contained (no node, no keys, no waiting): deploys the stack, a university submits its ed25519 key, a ministry proposes accreditation, three ministries vote For, the proposal is queued, the timelock matures, it executes — then the script proves `isAccredited == true` and prints the university's public key. That script *is* the pitch; nothing is improvised live.

### Deploy to a local anvil

```bash
anvil                                    # terminal 1
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast   # terminal 2
```

Deployed addresses are logged and written to `deployments/<chainid>.json`. Read the registry with **no wallet and no funds**:

```bash
cast call $REGISTRY "isAccredited(address)(bool)" $UNIVERSITY --rpc-url http://127.0.0.1:8545
cast call $REGISTRY "publicKeyOf(address)(bytes)" $UNIVERSITY --rpc-url http://127.0.0.1:8545
```

### Deploy to a testnet (Base Sepolia / Sepolia)

```bash
export PRIVATE_KEY=0x...                      # funded from a public faucet
export PROFILE=demo                           # or "realistic"
export FOUNDING_MINISTRIES=0xA...,0xB...,0xC...          # optional, defaults to 5 anvil accounts
export FOUNDING_MINISTRY_NAMES="Ministry A,Ministry B,Ministry C"
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

### Configuration profiles

Selected with `PROFILE` (default `demo`):

| Parameter | `demo` | `realistic` |
|---|---|---|
| `votingDelay` | 0 blocks | 7200 blocks (~1 day) |
| `votingPeriod` | 50 blocks (~10 min) | 50400 blocks (~1 week) |
| Timelock `minDelay` | 60 s | 172800 s (2 days) |
| Quorum | 3 | 3 |

The vote clock is **block numbers** (inherited from `ERC721Votes`).

## The governance flows

**Applications use a single self-resolving vote.** A ministry calls `governor.proposeAccreditation(university)`, which opens one proposal that is *always executable* once its voting window closes: the executed call, `registry.resolveApplication(university)`, reads the final tally and **accredits** when quorum was reached with more For than Against — and **auto-rejects** in every other case, including a vote nobody showed up for. One vote, both outcomes; a failed vote can never strand an application in limbo, and a rejected university may re-apply. (The split `accredit`/`rejectApplication` primitives still exist for spec compatibility.)

Every other action is a standard Governor proposal; only the encoded call differs:

| Action | Target | Call |
|---|---|---|
| Resolve application (the normal path) | governor | `proposeAccreditation(university)` |
| Accredit university (split primitive) | registry | `accredit(university)` |
| Discredit university | registry | `discredit(university, reason)` |
| Reject application (split primitive) | registry | `rejectApplication(university)` |
| Approve key rotation | registry | `approveKeyRotation(university)` |
| Invite ministry | membership | `inviteMinistry(ministry, name)` |
| Disinvite ministry | membership | `revokeMembership(ministry)` |
| Change quorum | governor | `setQuorum(n)` |

Lifecycle: `propose` → wait `votingDelay` → `castVote` (1 = For) from ≥ quorum members → wait out `votingPeriod` → `queue` → wait `minDelay` → `execute`. Note that `queue` and `execute` take the same `targets/values/calldatas` plus `keccak256(bytes(description))` — **not** the proposal id (see the helpers in `script/DemoFlow.s.sol`).

No custom frontend needed for governance: the governor is **Tally-compatible out of the box** — point [Tally](https://www.tally.xyz) at the deployed governor address on a testnet and you get a full governance UI for free.

## Limitations (honest ones)

- **No proof of key possession.** A public key is opaque bytes: the contract verifies neither that it is well-formed for its `keyType` nor that the applicant controls the private key. Production would demand a challenge-response signature at application time.
- **Ministry identity is asserted, not verified.** Founding ministry addresses are configured at deploy time; nothing on-chain proves an address belongs to a real ministry. That trust lives off-chain.
- **Absolute quorum does not scale.** Quorum 3 is sane with 5 members and meaningless at 50. `setQuorum` exists so governance can raise it as membership grows, but someone has to remember to propose it. A quorum change also applies to proposals already in flight (it is not checkpointed per-proposal).
- **No gas-optimised revocation list.** Checking one university is cheap; enumerating a large registry on-chain is not. At scale a verifier would index events off-chain (the events carry everything needed).
- **Bootstrap moment.** The DAO cannot invite its first members (there is nobody to vote), so the deploy script seeds founders while it briefly owns the membership token, then transfers ownership to the timelock and renounces its admin role — the script asserts no EOA privilege survives deployment.
- **Resolution votes read quorum at execution time.** If `setQuorum` changes between a resolution vote's deadline and its execution, the new value decides the outcome (tallies themselves are frozen). Same live-quorum caveat as the rest of the system, worth knowing when demoing both features together.
