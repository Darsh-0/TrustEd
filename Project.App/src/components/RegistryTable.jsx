import { useState } from 'react'

function truncateAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function RegistryTable({ educators, isOwner, onRemove, pending }) {
  const [removing, setRemoving] = useState(null)

  const handleRemove = async (addr) => {
    setRemoving(addr)
    try {
      await onRemove(addr)
    } finally {
      setRemoving(null)
    }
  }

  if (educators.length === 0) {
    return (
      <div className="table-empty">
        No issuers registered yet. Add the first verified educator to get started.
      </div>
    )
  }

  return (
    <div className="table-body">
      {educators.map((edu) => (
        <div key={edu.address} className="table-row">
          <span className="table-cell" title={edu.address}>{truncateAddr(edu.address)}</span>
          <span className="table-cell">{edu.name}</span>
          <span className="table-cell">
            <span className="status-badge">Active</span>
          </span>
          <span className="table-cell">{edu.joinDate ?? '—'}</span>
          <span className="table-cell">
            {isOwner && (
              <button
                className="btn-remove"
                onClick={() => handleRemove(edu.address)}
                disabled={pending || removing === edu.address}
              >
                {removing === edu.address ? '...' : 'Remove'}
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
