import { useWallet } from './hooks/useWallet'
import { WalletConnect } from './components/WalletConnect'
import './App.css'

function App() {
  const wallet = useWallet()
  const { isConnected, networkName, truncatedAddress, address } = wallet

  return (
    <>
      <header id="app-header">
        <div className="brand">
          <div className="brand-dot" />
          <span className="brand-name">IssuerRegistry</span>
        </div>
        <WalletConnect wallet={wallet} />
      </header>

      <section id="hero">
        <div className="hero-left">
          <p className="hero-eyebrow">On-chain · Credentials · Trust</p>
          <h1>Verified<br />Educator<br />Registry</h1>
          <p className="hero-sub">
            A permanent on-chain registry of trusted educational institutions.
            Issue and verify academic credentials anyone can check.
          </p>
        </div>

        <div className="hero-right">
          {isConnected ? (
            <div className="conn-card">
              <div className="conn-card-head">
                <span className="live-dot" />
                <span className="conn-label">Connected</span>
              </div>
              <div className="conn-address">{truncatedAddress}</div>
              <span className="conn-network">{networkName}</span>
              <div className="conn-divider" />
              <div className="conn-stats">
                <div className="conn-stat">
                  <span className="conn-stat-val">0</span>
                  <span className="conn-stat-key">Issuers</span>
                </div>
                <div className="conn-stat">
                  <span className="conn-stat-val">0</span>
                  <span className="conn-stat-key">Active</span>
                </div>
              </div>
              <button className="btn-disconnect" onClick={wallet.disconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <p className="hero-prompt">
              Connect your wallet above to interact with the registry.
            </p>
          )}
        </div>

      <section id="registry">
        <div className="registry-bar">
          <div className="bar-left">
            <span className="bar-title">Issuer Directory</span>
            <span className="bar-count">0 registered</span>
          </div>
          {isConnected && (
            <button className="btn-add">+ Add Issuer</button>
          )}
        </div>

        {isConnected ? (
          <div className="registry-table">
            <div className="table-head">
              <span>Address</span>
              <span>Name</span>
              <span>Status</span>
              <span>Registered</span>
            </div>
            <div className="table-empty">
              No issuers registered yet. Add the first verified educator to get started.
            </div>
          </div>
        ) : (
          <div className="registry-gate">
            Connect your wallet to view the issuer directory.
          </div>
        )}
      </section>
    </>
  )
}

export default App
