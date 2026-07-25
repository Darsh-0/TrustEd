import { useState } from "react";
import { isAddress, BrowserProvider } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { useAccreditation } from "../hooks/useAccreditation";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Gate({ message }) {
  return (
    <div className="card mt-6 text-center text-sm text-neutral-500">
      {message}
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

  const header = (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900">Issue Degree</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Issue academic credentials to graduates.
        {isConnected && ` Connected as: ${truncatedAddress}`}
      </p>
    </div>
  );

  if (!isConnected) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        {header}
        <Gate message="Connect your wallet to access degree issuance." />
      </section>
    );
  }

  if (wrongNetwork || notConfigured) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        {header}
        <div className="card mt-6 text-center">
          <p className="text-sm text-neutral-500">
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
      <section className="mx-auto max-w-5xl px-6 py-12">
        {header}
        <Gate message="Loading..." />
      </section>
    );
  }

  if (!isAccredited) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        {header}
        <Gate message="You must be an accredited university to issue degrees." />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg px-6 py-12">
      {header}

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
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
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-[#17463C]/20 bg-[#17463C]/5 px-3 py-2 text-sm text-[#17463C]">
            Degree issued successfully!
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={submitting}
        >
          {submitting ? "Signing & Sending..." : "Issue Degree"}
        </button>
      </form>
    </section>
  );
}
