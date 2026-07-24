import './WalletConnect.css'

export function WalletConnect({ wallet = {} }) {
  const {
    address,
    truncatedAddress,
    networkName,
    isConnecting,
    isConnected,
    hasWallet,
    error,
    connect,
    disconnect,
  } = wallet

  if (!hasWallet) {
    return (
      <div className="wc-root">
        <span className="wc-no-wallet">
          No wallet detected —{' '}
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noreferrer"
          >
            install MetaMask
          </a>
        </span>
      </div>
    )
  }

  if (isConnected) {
    return (
      <div className="wc-root">
        <div className="wc-connected">
          <span className="wc-network">{networkName}</span>
          <span className="wc-address" title={address}>
            {truncatedAddress}
          </span>
          <button className="wc-btn wc-btn--disconnect" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="wc-root">
      {error && <span className="wc-error">{error}</span>}
      <button
        className="wc-btn wc-btn--connect"
        onClick={connect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    </div>
  )
}
