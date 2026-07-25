import { useState } from 'react'
import { isAddress } from 'ethers'
import { useWallet } from '../hooks/useWallet'
import { useAccreditation } from '../hooks/useAccreditation'

function Gate({ message }) {
  return (
    <div className="card mt-6 text-center text-sm text-zinc-400">{message}</div>
  )
}

export function IssueDegreePage() {
  const wallet = useWallet()
  const { isConnected, networkName, truncatedAddress } = wallet
  const { isAccredited, loading, wrongNetwork, notConfigured } = useAccreditation(wallet)

  const [graduateAddress, setGraduateAddress] = useState('')
  const [degreeName, setDegreeName] = useState('')
  const [graduationDate, setGraduationDate] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState('')
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setSuccess(false)

    if (!isAddress(graduateAddress)) {
      setFormError('Invalid graduate wallet address')
      return
    }
    if (!degreeName.trim()) {
      setFormError('Degree name is required')
      return
    }
    if (!graduationDate) {
      setFormError('Graduation date is required')
      return
    }
    if (!fieldOfStudy.trim()) {
      setFormError('Field of study is required')
      return
    }

    // Placeholder for future on-chain logic
    console.log('Issuing degree:', { graduateAddress, degreeName, graduationDate, fieldOfStudy })

    setSuccess(true)
    setGraduateAddress('')
    setDegreeName('')
    setGraduationDate('')
    setFieldOfStudy('')
  }

  const header = (
    <div>
      <h2 className="text-2xl font-semibold text-white">Issue Degree</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Issue academic credentials to graduates.
        {isConnected && ` Connected as: ${truncatedAddress} (${networkName})`}
      </p>
    </div>
  )

  if (!isConnected) {
    return (
      <section>
        {header}
        <Gate message="Connect your wallet to access degree issuance." />
      </section>
    )
  }

  if (wrongNetwork || notConfigured) {
    return (
      <section>
        {header}
        <Gate message={wrongNetwork ? 'Connect to the correct network to issue degrees.' : 'DAO registry not configured.'} />
      </section>
    )
  }

  if (loading) {
    return (
      <section>
        {header}
        <Gate message="Loading..." />
      </section>
    )
  }

  if (!isAccredited) {
    return (
      <section>
        {header}
        <Gate message="Only universities accredited by the DAO can issue degrees. This address is not accredited." />
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-lg">
      {header}

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
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
          <label htmlFor="degreeName" className="label">Degree Name</label>
          <input
            id="degreeName"
            type="text"
            placeholder="e.g., Bachelor of Science"
            value={degreeName}
            onChange={(e) => setDegreeName(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="graduationDate" className="label">Graduation Date</label>
          <input
            id="graduationDate"
            type="date"
            value={graduationDate}
            onChange={(e) => setGraduationDate(e.target.value)}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="fieldOfStudy" className="label">Field of Study</label>
          <input
            id="fieldOfStudy"
            type="text"
            placeholder="e.g., Computer Science"
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            className="input"
            required
          />
        </div>

        {formError && (
          <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {formError}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-lime-900/60 bg-lime-950/40 px-3 py-2 text-sm text-lime-400">
            Degree issued successfully!
          </p>
        )}

        <button type="submit" className="btn-primary w-full">
          Issue Degree
        </button>
      </form>
    </section>
  )
}
