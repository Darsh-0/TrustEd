# Accreditation DAO — Playground Frontend

An interactive playground for the [University Accreditation DAO](../university-dao/): switch between roles (ministry, university, observer), drive the full governance lifecycle, and watch every event land on-chain in a live decoded activity feed.

Built with **Vite + Svelte 5 + viem**. No wallet extension needed — the app signs with the well-known anvil developer keys (local demo only, obviously).

## Run it

```bash
# terminal 1 — chain
anvil

# terminal 2 — contracts (from the sibling repo)
cd ../university-dao
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# terminal 3 — frontend
npm install
npm run dev            # → http://localhost:5173
```

Optionally seed a demo story first (an accredited university, a staged key rotation, an active proposal, a full event history):

```bash
npm run smoke          # also serves as an end-to-end test of the app's ABIs
```

The default contract addresses assume a **fresh anvil** (deterministic deployer nonces). If you redeploy on a used chain, update them under **⚙ connection** in the header.

## What you can do

| Role (header dropdown) | Powers |
|---|---|
| 👁 Observer | Read everything — proves the registry needs no wallet, no gas |
| 🏛 A ministry (accounts #1–5) | Put applications to a vote; propose discredit / key-rotation approval / invite / remove / quorum change; vote; queue; execute |
| 🎓 A university (accounts #6–7, or any unused account) | Submit an application with its own key, stage a key rotation |

**Applications resolve in one vote.** "Put application to a vote" opens a *resolution* proposal: For = accredit, Against = reject, and once the voting window closes it is executable either way — quorum + majority For accredits, anything else auto-rejects (the university may re-apply). The card shows a live outcome preview ("outcome if voting ended now: ACCREDIT/REJECT") and the queue button announces the locked-in result.

The right sidebar is the "what is actually happening" half:

- **Chain controls** — current block and chain time, plus `anvil_mine` / `evm_increaseTime` buttons. anvil only mines when transactions arrive, so voting periods and the timelock delay pass only when you push the chain forward; proposal cards offer exactly-sized "mine N to close voting" / "warp to maturity" shortcuts.
- **On-chain activity** — every log from the four contracts, decoded and narrated (proposals, votes, timelock schedule/execute, mints, delegations, role grants), filterable by contract, with copyable tx hashes.

Each proposal card shows the decoded call it will execute, a live vote meter against the quorum line, and a **raw on-chain payload** drawer (target, calldata, descriptionHash) — the exact arguments `queue`/`execute` need.

The Governance tab also has a **bypass test**: a button that calls `registry.accredit()` directly from your current account. It reverts with `OwnableUnauthorizedAccount` — that revert is the security model, live.

## Architecture

- `src/lib/contracts.ts` — human-readable ABIs (viem `parseAbi`), default deterministic addresses, enums.
- `src/lib/accounts.ts` — the anvil dev accounts used as playable roles.
- `src/lib/chain.svelte.ts` — one reactive store: a 1.6s poll rebuilds the whole picture from `getLogs` (block 0 → latest) plus `eth_call`s; writes go simulate-first so reverts surface as decoded custom errors in toasts.
- `src/lib/format.ts` — event → human sentence narration, calldata decoding.
- `src/lib/components/` — views (Registry / University desk / Governance) and widgets (proposal card, activity feed, chain controls, role switcher).
- `scripts/smoke.ts` — headless end-to-end: applies, proposes, votes, queues, warps, executes, verifies the bypass revert, and checks every event type decodes. `npm run smoke`.

State is derived from chain logs on every poll rather than cached locally — what you see is literally what the chain says, which is the point of the playground.
