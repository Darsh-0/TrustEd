# TrustEd: A decentralized, DAO-verified credential registry that proves your degree is real without exposing your data.  

<img width="1536" height="371" alt="TrustEd_Logo" src="https://github.com/user-attachments/assets/5c236578-1c25-43dd-bc79-dbc9c03ec74c" />

## Description:

A decentralized, privacy-preserving credential verification platform; built for graduates, universities, and employers. Solving degree fraud globally and privately, starting with New Zealand.

### What problem does it solve:

Verifying a degree today means phone calls, emails, and trusting paperwork that can be forged. Fake credentials aren't just an HR problem, they put patients under unqualified doctors and sensitive systems in the hands of unverified staff. Our project fixes this by removing the need for a single trusted authority to vouch for anything.

### How it works:

A DAO of accrediting bodies (e.g. ministries of education across different countries) votes to approve legitimate universities, creating a public, tamper-proof on-chain registry of trusted issuers. Approved universities issue degree credentials directly to a graduate's wallet, but only a cryptographic hash of the credential is stored on-chain; the actual degree details stay private, shared only between the university and the graduate. When an employer needs proof of qualification, the graduate shares their credential directly; the employer verifies it in seconds by checking the issuer against the DAO registry and matching the hash on-chain, with no calls, no paperwork, and no unnecessary personal data exposed. Our solution encapsulates this in a minimalistic application that’s easy to use for all end users.

### What’s next:

We want to extend the same framework beyond degrees to other credentials; citizenship, age verification, professional licenses, turning this into a general-purpose foundation for trustworthy, truly private, digital identity in New Zealand and internationally.

## Architecture

Four pieces:

| | |
| --- | --- |
| [`university-dao/`](university-dao/) | The DAO. Ministries vote universities into accreditation; the `UniversityRegistry` is the result. Foundry. |
| [`Project.Api/`](Project.Api/) | Read-only API over the DAO registry, plus credential issue/claim routes. Express + ethers. |
| [`Project.App/`](Project.App/) | The credential app. Lists accredited universities and gates degree issuance on accreditation. React + Vite. |
| [`university-dao-tool/`](university-dao-tool/) | The governance playground: switch roles, propose, vote, queue, execute, and watch a live decoded event feed. Svelte + viem. |

The DAO is the only source of truth for accreditation. The API and the app **read** it and
never write to it — there is no ministry, voting, or application UI in them. Everything that
*produces* an accreditation lives in the DAO tool.

## Running it

Needs [Foundry](https://getfoundry.sh) and [Node.js](https://nodejs.org). Each script owns a
terminal:

```bash
# Terminal 1 — anvil + deploy the DAO + wire up the .env files. Leave it running.
./1-start-chain.sh

# Terminal 2 — the accreditation API on http://localhost:5000
./2-start-api.sh

# Terminal 3 — the credential app on http://localhost:5173
./3-start-app.sh

# Terminal 4 — the DAO governance tool on http://localhost:5174 (optional)
./4-start-dao-tool.sh
```

A fresh DAO has an empty registry, so the app starts with an empty directory. To put real
data behind it, run this once (any terminal) — it drives the actual governance flow, so the
universities are accredited because the DAO voted them in:

```bash
./seed-demo.sh
```

`1-start-chain.sh` writes the deployed addresses into each project's `.env`, so nothing else
needs configuring. Ctrl-C on terminal 1 stops the chain and discards its state; re-running
redeploys from scratch.

If port 8545 is taken, run every script with the same override:

```bash
ANVIL_PORT=8546 ./1-start-chain.sh
```

The API defaults to port 5000, which macOS uses for AirPlay Receiver. Either turn that off in
System Settings → General → AirDrop & Handoff, or use `PORT=5001 ./2-start-api.sh`.

## Connecting a wallet

The directory loads without a wallet. To issue a degree you need to connect as an accredited
university: point MetaMask at `http://127.0.0.1:8545` (chain 31337) and import one of the
university accounts `seed-demo.sh` prints when it finishes.

The DAO tool needs no wallet at all — it signs with anvil's dev keys and lets you play any
role from a dropdown. It also ships its own richer seed (`npm run smoke` in
`university-dao-tool/`), which sets up an accredited university, a staged key rotation, and a
live proposal in one go.

## Authors and Acknowledgments
- Darsh
- Ed
- Reuben
- Siegfried
- Sienna
- Vlad

A big thank you to the sponsors and organisers of the 2026 Christchurch Web3Hackathon for making this possible.
