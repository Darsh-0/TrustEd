import { useWallet } from "../hooks/useWallet";
import { useAccreditation } from "../hooks/useAccreditation";
import { UniversityTable } from "../components/UniversityTable";

export function RegistryPage() {
  const wallet = useWallet();
  const { address, networkName } = wallet;
  const { count, loading, error, notConfigured, wrongNetwork, universities } =
    useAccreditation(wallet);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            Accredited universities
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Voted in by the Ministry DAO and read straight from the chain.
          </p>
        </div>
        <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
          {count} accredited
        </span>
      </div>

      {wrongNetwork && (
        <div className="mt-6 rounded-xl border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-400">
          Wrong network — you're on {networkName}. Switch to the network the DAO
          is deployed on (chain 31337).
          <button
            className="btn-outline ml-3 px-3! py-1!"
            onClick={() => wallet.switchNetwork(31337)}
          >
            Switch Network
          </button>
        </div>
      )}

      <div className="mt-6">
        {notConfigured ? (
          <div className="card text-center text-sm text-zinc-400">
            DAO registry not configured — set VITE_UNIVERSITY_REGISTRY_ADDRESS
            in .env
          </div>
        ) : error ? (
          <div className="card text-center text-sm text-red-400">{error}</div>
        ) : loading ? (
          <div className="card text-center text-sm text-zinc-400">
            Loading the directory…
          </div>
        ) : (
          <UniversityTable universities={universities} address={address} />
        )}
      </div>
    </section>
  );
}
