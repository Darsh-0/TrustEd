function truncateAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function UniversityTable({ universities, address }) {
  if (universities.length === 0) {
    return (
      <div className="card text-center text-sm text-zinc-400">
        No accredited universities yet. Institutions appear here once the DAO votes their
        accreditation through.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-6 py-3 font-medium">Address</th>
            <th className="px-4 py-3 font-medium">Institution</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium">Since</th>
          </tr>
        </thead>
        <tbody>
          {universities.map((uni) => {
            const isYou = address && uni.address.toLowerCase() === address.toLowerCase()
            return (
              <tr
                key={uni.address}
                className={`border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30 ${
                  isYou ? 'border-l-4 border-l-lime-400 bg-lime-950/20' : ''
                }`}
              >
                <td className="px-6 py-3 font-mono text-xs text-zinc-300" title={uni.address}>
                  {truncateAddr(uni.address)}
                </td>
                <td className="px-4 py-3 text-zinc-200">
                  {uni.name}
                  {isYou && (
                    <span className="ml-2 rounded-full bg-lime-950/60 px-2 py-0.5 text-xs font-medium text-lime-400 ring-1 ring-lime-900/60">
                      You
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">{uni.country || '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-lime-950/60 px-2 py-0.5 text-xs font-medium text-lime-400 ring-1 ring-lime-900/60">
                    Accredited
                  </span>
                </td>
                <td className="px-6 py-3 text-zinc-400">{uni.since ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
