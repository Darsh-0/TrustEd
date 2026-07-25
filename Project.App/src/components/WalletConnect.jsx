import { useState } from "react";
import { useWallet } from "../hooks/useWallet";

export function WalletConnect() {
  const {
    truncatedAddress,
    address,
    isConnecting,
    isConnected,
    hasWallet,
    error,
    connect,
    disconnect,
  } = useWallet();
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!hasWallet) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-outline cursor-pointer"
      >
        Install MetaMask
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {isConnected ? (
        <>
          <div className="relative">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700 cursor-pointer hover:border-neutral-400"
              onClick={copyAddress}
              title="copy wallet address"
            >
              {truncatedAddress}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </span>
            {copied && (
              <div className="absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded bg-neutral-800 px-2 py-1 text-xs text-white whitespace-nowrap">
                Copied!
              </div>
            )}
          </div>
          <button className="btn-outline cursor-pointer" onClick={disconnect}>
            Disconnect
          </button>
        </>
      ) : (
        <button
          className="btn-primary cursor-pointer"
          onClick={connect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}
