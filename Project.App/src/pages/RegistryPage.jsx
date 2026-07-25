import { useWallet } from '../hooks/useWallet'
import { useAccreditation } from '../hooks/useAccreditation'
import { AccreditationStatus } from '../components/AccreditationStatus'
import { UniversityTable } from '../components/UniversityTable'

export function RegistryPage() {
  const wallet = useWallet()
  const { isConnected, networkName, truncatedAddress } = wallet
  const { count, isAccredited, loading, error, notConfigured, wrongNetwork, universities } =
    useAccreditation(wallet)

  return (
    <>
      <section id="hero">
        <div className="hero-left">
          <p className="hero-eyebrow">On-chain · Credentials · Trust</p>
          <h1>
            Accredited
            <br />
            University
            <br />
            Registry
          </h1>
          <p className="hero-sub">
            Universities accredited by the Ministry DAO, read straight from the chain.
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
                  <span className="conn-stat-val">{count}</span>
                  <span className="conn-stat-key">Accredited</span>
                </div>
              </div>
              <AccreditationStatus isAccredited={isAccredited} loading={loading} error={error} />
              <button className="btn-disconnect" onClick={wallet.disconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <p className="hero-prompt">
              Connect your wallet above to check your own accreditation and issue degrees.
            </p>
          )}
        </div>
      </section>

      {wrongNetwork && (
        <div className="network-banner">
          Wrong network — you're on {networkName}. Please switch to the network the DAO is
          deployed on (chain 31337).
          <button className="btn-switch-network" onClick={() => wallet.switchNetwork(31337)}>
            Switch Network
          </button>
        </div>
      )}

      {notConfigured && (
        <div className="network-banner">
          DAO registry not configured — set VITE_UNIVERSITY_REGISTRY_ADDRESS in .env
        </div>
      )}

      <section id="registry">
        <div className="registry-bar">
          <div className="bar-left">
            <span className="bar-title">Accredited Universities</span>
            <span className="bar-count">{count} accredited</span>
          </div>
        </div>

        {notConfigured ? (
          <div className="registry-gate">
            Set VITE_UNIVERSITY_REGISTRY_ADDRESS to the DAO's UniversityRegistry to load the
            directory.
          </div>
        ) : error ? (
          <div className="registry-gate">{error}</div>
        ) : loading ? (
          <div className="registry-gate">Loading the directory…</div>
        ) : (
          <div className="registry-table">
            <div className="table-head">
              <span>Address</span>
              <span>Institution</span>
              <span>Country</span>
              <span>Key Type</span>
              <span>Status</span>
              <span>Since</span>
            </div>
            <UniversityTable universities={universities} />
          </div>
        )}
      </section>
    </>
  )
}
