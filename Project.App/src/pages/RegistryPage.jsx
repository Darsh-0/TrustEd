import { useWallet } from "../hooks/useWallet";
import { useAccreditation } from "../hooks/useAccreditation";
import { UniversityTable } from "../components/UniversityTable";

export function RegistryPage() {
  const wallet = useWallet();
  const { address, networkName } = wallet;
  const { count, loading, error, notConfigured, wrongNetwork, universities } =
    useAccreditation(wallet);

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">
            Accredited universities
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Voted in by the Ministry DAO and read straight from the chain.
          </p>
        </div>
        <span className="rounded-full border border-[#17463C]/30 bg-[#17463C]/5 px-3 py-1.5 text-xs font-semibold text-[#17463C]">
          {count} accredited
        </span>
      </div>

      {wrongNetwork && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Wrong network — you're on {networkName}. Switch to the network the
            DAO is deployed on (chain 31337).
          </span>
          <button
            className="rounded-lg bg-[#17463C] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#0f332b]"
            onClick={() => wallet.switchNetwork(31337)}
          >
            Switch Network
          </button>
        </div>
      )}

      <div className="mt-6">
        {notConfigured ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
            DAO registry not configured — set VITE_UNIVERSITY_REGISTRY_ADDRESS
            in .env
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-600">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
            Loading the directory…
          </div>
        ) : (
          <UniversityTable universities={universities} address={address} />
        )}
      </div>
    </section>
  );
}