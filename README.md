# Web3 Hackathon — DAO-accredited academic credentials

Three pieces:

| | |
| --- | --- |
| [`university-dao/`](university-dao/) | The DAO. Ministries vote universities into accreditation; the `UniversityRegistry` is the result. Foundry. |
| [`Project.Api/`](Project.Api/) | Read-only API over the DAO registry. Express + ethers. |
| [`Project.App/`](Project.App/) | The credential app. Lists accredited universities and gates degree issuance on accreditation. React + Vite. |

The DAO is the only source of truth for accreditation. The API and the app **read** it and
never write to it — there is no ministry, voting, or application UI outside the DAO itself.

## Running it

Needs [Foundry](https://getfoundry.sh) and [Node.js](https://nodejs.org). Three terminals:

```bash
# Terminal 1 — anvil + deploy the DAO + wire up the .env files. Leave it running.
./1-start-chain.sh

# Terminal 2 — the accreditation API on http://localhost:5000
./2-start-api.sh

# Terminal 3 — the web app on http://localhost:5173
./3-start-app.sh
```

A fresh DAO has an empty registry, so the app starts with an empty directory. To put real
data behind it, run this once (any terminal) — it drives the actual governance flow, so the
universities are accredited because the DAO voted them in:

```bash
./seed-demo.sh
```

`1-start-chain.sh` writes the deployed registry address into `Project.Api/.env` and
`Project.App/.env`, so the other two scripts need no configuration. Ctrl-C on terminal 1
stops the chain and discards its state; re-running redeploys from scratch.

If port 8545 is taken, run every script with the same override:

```bash
ANVIL_PORT=8546 ./1-start-chain.sh
```

## Connecting a wallet

The directory loads without a wallet. To issue a degree you need to connect as an accredited
university: point MetaMask at `http://127.0.0.1:8545` (chain 31337) and import one of the
university accounts `seed-demo.sh` prints when it finishes.
