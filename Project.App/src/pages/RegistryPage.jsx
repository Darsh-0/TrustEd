import { useWallet } from "../hooks/useWallet";
import { useAccreditation } from "../hooks/useAccreditation";
import { UniversityTable } from "../components/UniversityTable";

export function RegistryPage() {
  const wallet = useWallet();
  const { address, networkName } = wallet;
  const { count, loading, error, notConfigured, wrongNetwork, universities } =
    useAccreditation(wallet);

  return (
    <section className="mx-auto max-w-container px-6 py-12 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight text-primary">
            Accredited Educators
          </h2>
          <p className="mt-3 max-w-xl text-sm text-on-surface-variant">
            A real-time registry of verified educational institutions. Voted in
            by the Ministry DAO and read directly from the blockchain ledger to
            ensure absolute academic integrity.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-container/10 px-3 py-1.5 font-label text-xs font-semibold text-primary">
          {count} accredited
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
      </div>

      {wrongNetwork && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Wrong network — you're on {networkName}. Switch to the network the
            DAO is deployed on (chain 31337).
          </span>
          <button
            className="btn-primary py-2"
            onClick={() => wallet.switchNetwork(31337)}
          >
            Switch Network
          </button>
        </div>
      )}

      <div className="mt-6">
        {notConfigured ? (
          <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center text-sm text-on-surface-variant">
            DAO registry not configured — set VITE_UNIVERSITY_REGISTRY_ADDRESS
            in .env
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error-container bg-error-container/40 p-10 text-center text-sm text-on-error-container">
            {error}
          </div>
        ) : loading ? (
          <div className="card p-10 text-center text-sm text-on-surface-variant">
            Loading the directory…
          </div>
        ) : (
          <UniversityTable universities={universities} address={address} />
        )}
      </div>
    </section>
  );
}
