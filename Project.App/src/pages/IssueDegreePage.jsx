import { useState } from "react";
import { isAddress, BrowserProvider } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { useAccreditation } from "../hooks/useAccreditation";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Gate({ message }) {
  return (
    <div className="card mx-auto mt-8 max-w-lg text-center text-sm text-on-surface-variant">
      {message}
    </div>
  );
}

function Header({ isConnected, truncatedAddress }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-headline text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
        Issue Academic Credential
      </h2>
      <p className="mt-4 text-base text-on-surface-variant">
        Securely record and verify academic achievement on the decentralized
        registry. This action creates a permanent, tamper-proof record.
      </p>

      {isConnected && (
        <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 font-label text-sm font-semibold text-on-surface">
          <svg
            className="h-4 w-4 text-on-surface-variant"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Connected: {truncatedAddress}
          <span className="h-2 w-2 rounded-full bg-primary" />
        </span>
      )}
    </div>
  );
}

export function IssueDegreePage() {
  const wallet = useWallet();
  const { isConnected, truncatedAddress } = wallet;
  const { isAccredited, loading, wrongNetwork, notConfigured } =
    useAccreditation(wallet);

  const [graduateAddress, setGraduateAddress] = useState("");
  const [degreeName, setDegreeName] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    if (!isAddress(graduateAddress)) {
      setFormError("Invalid graduate wallet address");
      return;
    }
    if (!degreeName.trim()) {
      setFormError("Degree name is required");
      return;
    }
    if (!graduationDate) {
      setFormError("Graduation date is required");
      return;
    }
    if (!fieldOfStudy.trim()) {
      setFormError("Field of study is required");
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError("Valid email address is required");
      return;
    }

    setSubmitting(true);
    try {
      const credential = {
        issuer: wallet.address,
        graduate: graduateAddress,
        degreeName: degreeName.trim(),
        graduationDate,
        fieldOfStudy: fieldOfStudy.trim(),
        issuedAt: Math.floor(Date.now() / 1000),
      };

      const message = JSON.stringify(credential);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const res = await fetch(`${API_URL}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, signature, email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Server error: ${res.status}`);
      }

      setSuccess(true);
      setGraduateAddress("");
      setDegreeName("");
      setGraduationDate("");
      setFieldOfStudy("");
      setEmail("");
    } catch (err) {
      if (err.code === "ACTION_REJECTED") {
        setFormError("Signature request was rejected");
      } else {
        setFormError(err.message || "Failed to issue degree");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <section className="mx-auto max-w-container px-6 py-16 sm:px-10">
        <Header isConnected={isConnected} truncatedAddress={truncatedAddress} />
        <Gate message="Connect your wallet to access degree issuance." />
      </section>
    );
  }

  if (wrongNetwork || notConfigured) {
    return (
      <section className="mx-auto max-w-container px-6 py-16 sm:px-10">
        <Header isConnected={isConnected} truncatedAddress={truncatedAddress} />
        <div className="card mx-auto mt-8 max-w-lg text-center">
          <p className="text-sm text-on-surface-variant">
            {wrongNetwork
              ? "Connect to the correct network to issue degrees."
              : "Registry not configured."}
          </p>
          {wrongNetwork && (
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() =>
                wallet.switchNetwork(
                  Number(import.meta.env.VITE_REGISTRY_CHAIN_ID ?? 31337),
                )
              }
            >
              Switch Network
            </button>
          )}
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-container px-6 py-16 sm:px-10">
        <Header isConnected={isConnected} truncatedAddress={truncatedAddress} />
        <Gate message="Loading..." />
      </section>
    );
  }

  if (!isAccredited) {
    return (
      <section className="mx-auto max-w-container px-6 py-16 sm:px-10">
        <Header isConnected={isConnected} truncatedAddress={truncatedAddress} />
        <Gate message="You must be an accredited university to issue degrees." />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-container px-6 py-16 sm:px-10">
      <Header isConnected={isConnected} truncatedAddress={truncatedAddress} />

      <form
        onSubmit={handleSubmit}
        className="card mx-auto mt-10 max-w-2xl space-y-6"
      >
        <div>
          <label htmlFor="graduateAddress" className="label">
            Graduate Wallet Address
          </label>
          <input
            id="graduateAddress"
            type="text"
            placeholder="0x..."
            value={graduateAddress}
            onChange={(e) => setGraduateAddress(e.target.value)}
            className="input"
            required
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="degreeName" className="label">
              Degree Name
            </label>
            <input
              id="degreeName"
              type="text"
              placeholder="e.g., Bachelor of Science"
              value={degreeName}
              onChange={(e) => setDegreeName(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="graduationDate" className="label">
              Graduation Date
            </label>
            <input
              id="graduationDate"
              type="date"
              value={graduationDate}
              onChange={(e) => setGraduationDate(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="fieldOfStudy" className="label">
            Field of Study
          </label>
          <input
            id="fieldOfStudy"
            type="text"
            placeholder="e.g., Computer Science"
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="label">
            Graduate Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="graduate@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </div>

        {formError && (
          <p className="rounded-lg border border-error-container bg-error-container/40 px-3 py-2 text-sm text-on-error-container">
            {formError}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-primary/20 bg-primary-container/10 px-3 py-2 text-sm text-primary">
            Degree issued successfully!
          </p>
        )}

        <div>
          <button
            type="submit"
            className="btn-primary flex w-full items-center justify-center gap-2 py-4 text-base cursor-pointer"
            disabled={submitting}
          >
            {submitting ? "Signing & Sending..." : "Issue Degree"}
          </button>
          <p className="mt-3 text-center text-xs text-on-surface-variant">
            By clicking issue, you confirm this data is accurate.
          </p>
        </div>
      </form>
    </section>
  );
}
