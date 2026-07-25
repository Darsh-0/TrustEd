import { useWallet } from '../hooks/useWallet'

export function WalletConnect() {
  const {
    truncatedAddress,
    isConnecting,
    isConnected,
    hasWallet,
    error,
    connect,
    disconnect,
  } = useWallet()

  if (!hasWallet) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-outline"
      >
        Install MetaMask
      </a>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-400">{error}</span>}
      {isConnected ? (
        <>
          <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-300">
            {truncatedAddress}
          </span>
          <button className="btn-outline" onClick={disconnect}>
            Disconnect
          </button>
        </>
      ) : (
        <button className="btn-primary" onClick={connect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
