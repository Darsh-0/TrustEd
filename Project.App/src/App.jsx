import { useWallet } from './hooks/useWallet'
import { useEducator } from './hooks/useEducator'
import { ConnectWallet } from './components/ConnectWallet'
import { EducatorStatus } from './components/EducatorStatus'
import './App.css'

function App() {
  const { account, provider, error, connect, disconnect } = useWallet()
  const { isEducator, loading, error: educatorError } = useEducator(provider, account)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Issuer Registry</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}

        <div className="mb-6">
          <ConnectWallet
            account={account}
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>

        {account && (
          <EducatorStatus
            isEducator={isEducator}
            loading={loading}
            error={educatorError}
          />
        )}
      </div>
    </div>
  )
}

export default App
