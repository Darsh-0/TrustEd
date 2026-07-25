# Project.App

The credential app. Universities are accredited by the DAO in
[`../university-dao`](../university-dao/); this app **only reads the outcome**. It has no
ministry, voting, or accreditation-application UI — those live in the DAO, deliberately.

- The directory lists universities the DAO has voted into `Accredited`, read over plain RPC
  (no wallet needed).
- **Issue Degree** unlocks only when the connected wallet is an accredited university, per
  the registry's `isAccredited`.

Copy `.env.example` to `.env` and set `VITE_UNIVERSITY_REGISTRY_ADDRESS` to the `registry`
address in `university-dao/deployments/<chainId>.json`, then `npm run dev`. The read logic
lives in [`src/hooks/useAccreditation.js`](src/hooks/useAccreditation.js).

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
