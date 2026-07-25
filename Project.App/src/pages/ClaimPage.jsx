import { useState } from "react";
import { BrowserProvider } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { saveCredential } from "../lib/store";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ClaimPage() {
  const wallet = useWallet();
  const { isConnected, address } = wallet;

  const [status, setStatus] = useState(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    return token ? "ready" : "idle";
  });
  const [credential, setCredential] = useState(null);
  const [error, setError] = useState(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    return token ? "" : "No claim token provided";
  });

  const handleClaim = async () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setStatus("error");
      setError("No claim token provided");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const message = `Claim credential for token: ${token}`;
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const res = await fetch(`${API}/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to claim credential");
      }

      const bundle = await res.json();
      await saveCredential(bundle);
      setCredential(bundle.credential);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      if (e.code === "ACTION_REJECTED") {
        setError("Signature request was rejected");
      } else {
        setError(e.message || "Failed to claim credential");
      }
    }
  };

  if (status === "idle") {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="card w-full max-w-lg text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-container">
            <svg
              className="h-6 w-6 text-on-error-container"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Invalid Link
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">{error}</p>
        </div>
      </section>
    );
  }

  if (!isConnected) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="card w-full max-w-lg text-center">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Claim Your Credential
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Connect your wallet to verify ownership and claim your degree.
          </p>
        </div>
      </section>
    );
  }

  if (status === "loading") {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="card w-full max-w-lg text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-surface-container-highest border-t-primary" />
          <p className="text-sm text-on-surface-variant">
            Claiming your credential...
          </p>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="card w-full max-w-lg text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-container">
            <svg
              className="h-6 w-6 text-on-error-container"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Claim Failed
          </h2>
          <p className="mt-2 text-sm text-on-error-container">{error}</p>
          <button onClick={handleClaim} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </section>
    );
  }

  if (status === "saved") {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="card w-full max-w-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="font-headline text-lg font-bold text-on-surface">
              Credential Claimed!
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Your degree has been saved to this device.
            </p>
          </div>

          {credential && (
            <div className="mt-6 rounded-lg border border-surface-container-highest bg-surface-container-low p-4">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-on-surface-variant">Degree</dt>
                  <dd className="font-medium text-on-surface">
                    {credential.degreeName}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Field of Study</dt>
                  <dd className="font-medium text-on-surface">
                    {credential.fieldOfStudy}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Graduation Date</dt>
                  <dd className="font-medium text-on-surface">
                    {credential.graduationDate}
                  </dd>
                </div>
                <div>
                  <dt className="text-on-surface-variant">Issued By</dt>
                  <dd className="font-mono text-xs text-on-surface-variant">
                    {credential.issuer}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="card w-full max-w-lg text-center">
        <h2 className="font-headline text-lg font-bold text-on-surface">
          Claim Your Credential
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Sign a message to prove you own this wallet, then claim your degree.
        </p>
        <button
          onClick={handleClaim}
          className="btn-primary mt-4 cursor-pointer"
        >
          Claim Credential
        </button>
      </div>
    </section>
  );
}
