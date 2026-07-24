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
      setError('Invalid Ethereum address')
      return
    }
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    try {
      await onAdd(address, name)
      setAddress('')
      setName('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <div className="add-form-fields">
        <input
          type="text"
          placeholder="0x..."
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="add-form-input"
          disabled={pending}
        />
        <input
          type="text"
          placeholder="Institution name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="add-form-input"
          disabled={pending}
        />
      </div>
      {error && <div className="add-form-error">{error}</div>}
      <div className="add-form-actions">
        <button type="submit" className="btn-add-confirm" disabled={pending}>
          {pending ? 'Adding...' : 'Add Issuer'}
        </button>
        <button type="button" className="btn-add-cancel" onClick={onClose} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  )
}
