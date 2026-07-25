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
      <div className="card text-center text-sm text-zinc-400">
        No issuers registered yet. Add the first verified educator to get started.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-6 py-3 font-medium">Address</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Registered</th>
            {isOwner && <th className="px-6 py-3 font-medium text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {educators.map((edu) => (
            <tr key={edu.address} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30">
              <td className="px-6 py-3 font-mono text-xs text-zinc-300" title={edu.address}>
                {truncateAddr(edu.address)}
              </td>
              <td className="px-4 py-3 text-zinc-200">{edu.name}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-full bg-lime-950/60 px-2 py-0.5 text-xs font-medium text-lime-400 ring-1 ring-lime-900/60">
                  Active
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-400">{edu.joinDate ?? '—'}</td>
              {isOwner && (
                <td className="px-6 py-3 text-right">
                  <button
                    className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-950 disabled:opacity-50"
                    onClick={() => handleRemove(edu.address)}
                    disabled={pending || removing === edu.address}
                  >
                    {removing === edu.address ? '...' : 'Remove'}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
