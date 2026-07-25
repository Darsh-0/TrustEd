function truncateAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function UniversityTable({ universities }) {
  if (universities.length === 0) {
    return (
      <div className="table-empty">
        No accredited universities yet. Institutions appear here once the DAO votes their
        accreditation through.
      </div>
    )
  }

  return (
    <div className="table-body">
      {universities.map((uni) => (
        <div key={uni.address} className="table-row">
          <span className="table-cell" title={uni.address}>{truncateAddr(uni.address)}</span>
          <span className="table-cell">{uni.name}</span>
          <span className="table-cell">{uni.country || '—'}</span>
          <span className="table-cell" title={uni.publicKey}>{uni.keyType || '—'}</span>
          <span className="table-cell">
            <span className="status-badge">Accredited</span>
          </span>
          <span className="table-cell">{uni.since ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
