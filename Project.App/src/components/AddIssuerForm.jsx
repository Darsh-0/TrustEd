import { useState } from 'react'
import { isAddress } from 'ethers'

export function AddIssuerForm({ onAdd, pending, onClose }) {
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isAddress(address)) {
      setError('Invalid wallet address')
      return
    }
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    try {
      await onAdd(address, name.trim())
      setAddress('')
      setName('')
      onClose?.()
    } catch (err) {
      setError(err?.shortMessage ?? err?.reason ?? err?.message ?? 'Transaction failed')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h3 className="text-sm font-semibold text-white">Add Verified Issuer</h3>

      <div>
        <label htmlFor="issuerAddress" className="label">Wallet Address</label>
        <input
          id="issuerAddress"
          type="text"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input"
          required
        />
      </div>

      <div>
        <label htmlFor="issuerName" className="label">Institution Name</label>
        <input
          id="issuerName"
          type="text"
          placeholder="e.g., University of Technology"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? 'Waiting for transaction...' : 'Add Issuer'}
      </button>
    </form>
  )
}
