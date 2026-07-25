function truncateAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function UniversityTable({ universities, address }) {
  if (universities.length === 0) {
    return (
      <div className="card text-center text-sm text-on-surface-variant">
        No accredited universities yet. Institutions appear here once the DAO
        votes their accreditation through.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container-high text-left font-label text-xs uppercase tracking-wide text-on-surface-variant">
            <th className="px-6 py-3 font-medium">Address</th>
            <th className="px-4 py-3 font-medium">Institution</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium">Since</th>
          </tr>
        </thead>
        <tbody>
          {universities.map((uni) => {
            const isYou =
              address && uni.address.toLowerCase() === address.toLowerCase();
            return (
              <tr
                key={uni.address}
                className={`border-b border-surface-container-high last:border-0 ${
                  isYou
                    ? "border-l-4 border-l-primary bg-primary-container/5"
                    : ""
                }`}
              >
                <td
                  className="px-6 py-3 font-mono text-xs text-on-surface-variant"
                  title={uni.address}
                >
                  {truncateAddr(uni.address)}
                </td>
                <td className="px-4 py-3 text-on-surface">
                  {uni.name}
                  {isYou && (
                    <span className="ml-2 rounded-full bg-primary-container/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                      You
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {uni.country || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-primary-container/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                    Accredited
                  </span>
                </td>
                <td className="px-6 py-3 text-on-surface-variant">
                  {uni.since ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
