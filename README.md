![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-26.1.1-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)
![Ethers.js](https://img.shields.io/badge/Ethers.js-6.17-2535A0?logo=ethers&logoColor=white)
![Resend](https://img.shields.io/badge/Resend-6.18-000000?logo=resend&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![React Router](https://img.shields.io/badge/React_Router-7.18-CA4245?logo=reactrouter&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-10.6-4B32C3?logo=eslint&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-0.8-363636?logo=solidity&logoColor=white)
![Foundry](https://img.shields.io/badge/Foundry-Forge-B92122?logo=ethereum&logoColor=white)
[![Remix](https://img.shields.io/badge/Remix-1C1C1C?logo=ethereum&logoColor=white)](https://remix.ethereum.org/)

# TrustEd: A decentralized, DAO-verified credential registry that proves your degree is real without exposing your data.

<img width="1536" height="371" alt="TrustEd_Logo" src="https://github.com/user-attachments/assets/5c236578-1c25-43dd-bc79-dbc9c03ec74c" />

## Description

A decentralized, privacy-preserving credential verification platform; built for graduates, universities, and employers. Solving degree fraud globally and privately, starting with New Zealand.

### What problem does it solve:

What problem does it solve:
Verifying a degree today means phone calls, emails, and trusting paperwork that can be forged. Fake credentials aren't just an HR problem, they put patients under unqualified doctors and sensitive systems in the hands of unverified staff. Our project fixes this by removing the need for a single trusted authority to vouch for anything.

### How it works:
A DAO of accrediting bodies (e.g. ministries of education across different countries) votes to approve legitimate universities, creating a public, tamper-proof on-chain registry of trusted issuers. Approved universities create degree credentials and sign them with their private key, entirely off-chain, then send them directly to the graduate's wallet. No degree data ever touches the blockchain. When an employer needs proof of qualification, the graduate shares their signed credential and signs it themselves to prove ownership. The employer verifies it in seconds: checking the university's signature against its known public key, and confirming that key belongs to a DAO-approved issuer on-chain. No calls, no paperwork, and no personal data is ever exposed on a public ledger. 

Our solution encapsulates this in a minimalistic application that's easy to use for all end users. 

### What’s next:
We want to extend the same framework beyond degrees to other credentials; citizenship, age verification, professional licenses, turning this into a general-purpose foundation for trustworthy, truly private, digital identity in New Zealand and internationally.


## Architecture

Four pieces:

| | |
| --- | --- |
| [`university-dao/`](university-dao/) | The DAO. Ministries vote universities into accreditation; the `UniversityRegistry` is the result. Foundry. |
| [`Project.Api/`](Project.Api/) | Read-only API over the DAO registry, plus credential issue/claim routes. Express + ethers. |
| [`Project.App/`](Project.App/) | The credential app. Lists accredited universities and gates degree issuance on accreditation. React + Vite. |

The DAO is the only source of truth for accreditation. The API and the app **read** it and
never write to it — there is no ministry, voting, or application UI in them. Everything that
*produces* an accreditation lives in the DAO contracts.

## Project Structure

```
TrustEd/
├── common.sh                  # Shared shell helpers for local scripts
├── start-all.sh               # Starts the full stack
├── seed-demo.sh               # Seeds the demo registry through the DAO flow
├── Project.Api/               # Express + ethers API for registry reads and credential routes
│   ├── src/
│   │   ├── index.ts           # API entry point and server bootstrap
│   │   ├── dao.ts             # DAO and registry access helpers
│   │   └── routes/
│   │       ├── auth.ts        # Authentication and wallet/session routes
│   │       └── transfer.ts    # Credential issue and claim routes
│   ├── artifacts/             # Solidity build artifacts consumed by the API
│   │   ├── build-info/        # Solc build metadata
│   │   └── contracts/         # Per-contract JSON artifacts
│   └── package.json           # API package manifest and scripts
├── Project.App/               # React + Vite credential directory and claim experience
│   ├── src/
│   │   ├── App.jsx            # Application shell and routing
│   │   ├── main.jsx           # Front-end bootstrap
│   │   ├── components/        # Shared UI pieces
│   │   ├── context/           # Wallet context and provider wiring
│   │   ├── hooks/             # Reusable React hooks
│   │   ├── lib/               # Client-side utilities and storage helpers
│   │   └── pages/             # Route-level screens
│   ├── public/                # Static assets served by Vite
│   └── package.json           # App package manifest and scripts
├── university-dao/            # Foundry workspace for governance and registry contracts
│   ├── src/                   # Solidity contracts for accreditation and registry logic
│   ├── script/                # Deployment and demo scripts
│   ├── deployments/           # Recorded deployment addresses and chain state
│   ├── lib/                   # Vendored Foundry dependencies
│   └── foundry.toml           # Foundry configuration
```

## Running it

Needs [Foundry](https://getfoundry.sh) and [Node.js](https://nodejs.org).

```bash
# Start the full stack: anvil + deploy the DAO + API + app. Leave it running.
./start-all.sh

# Start the full stack and seed demo universities in one go
./start-all.sh --seed
```

This starts:
- **Chain** on `http://127.0.0.1:8545` (chain 31337)
- **API** on `http://localhost:5000`
- **App** on `http://localhost:5173`

A fresh DAO has an empty registry, so the app starts with an empty directory. If you didn't
use `--seed`, you can seed demo universities separately (any terminal) — it drives the actual
governance flow, so the universities are accredited because the DAO voted them in:

```bash
./seed-demo.sh
```

`start-all.sh` writes the deployed addresses into each project's `.env`, so nothing else
needs configuring. Ctrl-C stops the chain and discards its state; re-running
redeploys from scratch.

If port 8545 is taken, run with a port override:

```bash
ANVIL_PORT=8546 ./start-all.sh
```

The API defaults to port 5000, which macOS uses for AirPlay Receiver. Either turn that off in
System Settings → General → AirDrop & Handoff, or use `PORT=5001 ./start-all.sh`.

## Environment Variables

`start-all.sh` automatically wires the following variables into each project's `.env`:

### Project.Api/.env

| Variable                      | Set by script | Description                                                  |
| ----------------------------- | ------------- | ------------------------------------------------------------ |
| `UNIVERSITY_REGISTRY_ADDRESS` | ✓             | Deployed UniversityRegistry contract address                 |
| `RPC_URL`                     | ✓             | RPC endpoint for the local anvil chain                       |
| `APP_BASE_URL`                | ✓             | Frontend app URL (used in credential claim/verify emails)    |
| `PORT`                        |               | API server port (defaults to 5000)                           |
| `FROM_EMAIL`                  |               | Sender email for credential notifications (e.g. via Resend)  |
| `RESEND_API_KEY`              |               | API key for the email service                                |

### Project.App/.env

| Variable                              | Set by script | Description                                        |
| ------------------------------------- | ------------- | -------------------------------------------------- |
| `VITE_UNIVERSITY_REGISTRY_ADDRESS`    | ✓             | Deployed UniversityRegistry contract address       |
| `VITE_RPC_URL`                        | ✓             | RPC endpoint for the local anvil chain             |
| `VITE_REGISTRY_CHAIN_ID`              | ✓             | Chain ID (31337 for local anvil)                   |
| `VITE_API_URL`                        | ✓             | Backend API URL (defaults to http://localhost:5000)|

Variables marked "Set by script" are automatically configured when you run `start-all.sh`.
The remaining variables must be set manually if you need their functionality (e.g. email
notifications require `FROM_EMAIL` and `RESEND_API_KEY`).

## Connecting a wallet

The directory loads without a wallet. To issue a degree you need to connect as an accredited
university: point MetaMask at `http://127.0.0.1:8545` (chain 31337) and import one of the
university accounts `seed-demo.sh` prints when it finishes.

## Authors and Acknowledgments

- [Darsh](https://github.com/Darsh-0)
- [Ed](https://github.com/Ed-Leonard)
- [Reuben](https://github.com/RJDonnison)
- [Siegfried](https://github.com/walkingAroundsoMuch)
- [Sienna](https://github.com/itzsiennaduh)
- [Vlad](https://github.com/nistorv)

A big thank you to the sponsors and organisers of the 2026 Christchurch Web3Hackathon for making this possible.
