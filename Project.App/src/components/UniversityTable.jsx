function truncateAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function UniversityTable({ universities, address }) {
  if (universities.length === 0) {
    return (
      <div className="card text-center text-sm text-neutral-500">
        No accredited universities yet. Institutions appear here once the DAO votes their
        accreditation through.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
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
                className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 ${
                  isYou ? 'border-l-4 border-l-[#17463C] bg-[#17463C]/5' : ''
                }`}
              >
                <td className="px-6 py-3 font-mono text-xs text-neutral-600" title={uni.address}>
                  {truncateAddr(uni.address)}
                </td>
                <td className="px-4 py-3 text-neutral-900">
                  {uni.name}
                  {isYou && (
                    <span className="ml-2 rounded-full bg-[#17463C]/10 px-2 py-0.5 text-xs font-medium text-[#17463C] ring-1 ring-[#17463C]/20">
                      You
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-500">{uni.country || '—'}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-[#17463C]/10 px-2 py-0.5 text-xs font-medium text-[#17463C] ring-1 ring-[#17463C]/20">
                    Accredited
                  </span>
                </td>
                <td className="px-6 py-3 text-neutral-500">{uni.since ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
