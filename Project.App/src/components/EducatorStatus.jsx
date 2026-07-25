export function EducatorStatus({ isEducator, loading, error }) {
  if (loading) {
    return (
      <div className="card py-3 text-sm text-zinc-400">
        Checking educator status...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-400">
        Error: {error}
      </div>
    )
  }

  if (isEducator) {
    return (
      <div className="rounded-xl border border-lime-900/60 bg-lime-950/40 px-4 py-3 text-sm font-medium text-lime-400">
        ✓ Verified Educator
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-900/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-400">
      Not authorized as educator
    </div>
  )
}
