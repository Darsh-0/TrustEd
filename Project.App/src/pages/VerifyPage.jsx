import { useState } from 'react'

export function VerifyPage() {
  const [graduateAddress, setGraduateAddress] = useState('')
  const [degreeId, setDegreeId] = useState('')
  const [result, setResult] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    setResult(null)

    // Placeholder for future on-chain verification logic
    console.log('Verifying degree:', { graduateAddress, degreeId })

    setResult({
      verified: false,
      message: 'Degree verification functionality coming soon.',
    })
  }

  return (
    <section className="mx-auto max-w-lg">
      <h2 className="text-2xl font-semibold text-white">Verify a degree</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Check whether a graduate holds a verified academic degree on-chain.
      </p>

      <form onSubmit={handleVerify} className="card mt-6 space-y-4">
        <div>
          <label htmlFor="graduateAddress" className="label">Graduate Wallet Address</label>
          <input
            id="graduateAddress"
            type="text"
            placeholder="0x..."
            value={graduateAddress}
            onChange={(e) => setGraduateAddress(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="degreeId" className="label">Degree ID (optional)</label>
          <input
            id="degreeId"
            type="text"
            placeholder="e.g., DEG-2026-001"
            value={degreeId}
            onChange={(e) => setDegreeId(e.target.value)}
            className="input"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Verify Degree
        </button>

        {result && (
          <p className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            {result.message}
          </p>
        )}
      </form>
    </section>
  )
}
