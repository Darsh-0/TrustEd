import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useRegistry } from '../hooks/useRegistry'
import { EducatorStatus } from '../components/EducatorStatus'
import { AddIssuerForm } from '../components/AddIssuerForm'
import { RegistryTable } from '../components/RegistryTable'

export function RegistryPage() {
  const wallet = useWallet()
  const { isConnected, networkName } = wallet
  const registry = useRegistry(wallet)
  const { count, isEducator, isOwner, loading, error, txPending, notConfigured, wrongNetwork, educators, addEducator, removeEducator } = registry

  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Accredited Educators</h2>
          <p className="mt-1 text-sm text-zinc-400">{count} registered issuers</p>
        </div>
        {isConnected && isOwner && !wrongNetwork && (
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Issuer'}
          </button>
        )}
      </div>

      {wrongNetwork && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-400">
          <span>
            Wrong network — you're on {networkName}. Switch to the local Hardhat network (chain 31337).
          </span>
          <button className="btn-outline ml-4 shrink-0" onClick={() => wallet.switchNetwork(31337)}>
            Switch Network
          </button>
        </div>
      )}

      {notConfigured && (
        <div className="mt-6 rounded-xl border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-400">
          Registry not configured — set VITE_REGISTRY_ADDRESS in .env
        </div>
      )}

      {isConnected && !wrongNetwork && !notConfigured && (
        <div className="mt-6">
          <EducatorStatus isEducator={isEducator} loading={loading} error={error} />
        </div>
      )}

      {showAddForm && isOwner && (
        <div className="mt-6">
          <AddIssuerForm
            onAdd={addEducator}
            pending={txPending}
            onClose={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="mt-6">
        {!notConfigured ? (
          <RegistryTable
            educators={educators}
            isOwner={isOwner}
            onRemove={removeEducator}
            pending={txPending}
          />
        ) : (
          <div className="card text-center text-sm text-zinc-400">
            Registry not configured.
          </div>
        )}
      </div>
    </section>
  )
}
