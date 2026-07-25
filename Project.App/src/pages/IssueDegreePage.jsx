import { useState } from 'react'
import { isAddress } from 'ethers'
import { useWallet } from '../hooks/useWallet'
import { useRegistry } from '../hooks/useRegistry'

export function IssueDegreePage() {
  const wallet = useWallet()
  const { isConnected, networkName, truncatedAddress } = wallet
  const registry = useRegistry(wallet)
  const { isEducator, loading, wrongNetwork, notConfigured } = registry

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

  if (!isConnected) {
    return (
      <section id="issue-degree">
        <div className="page-header">
          <h2>Issue Degree</h2>
          <p className="page-sub">Connect your wallet to issue academic credentials.</p>
        </div>
        <div className="registry-gate">
          Connect your wallet to access degree issuance.
        </div>
      </section>
    )
  }

  if (wrongNetwork || notConfigured) {
    return (
      <section id="issue-degree">
        <div className="page-header">
          <h2>Issue Degree</h2>
          <p className="page-sub">Issue academic credentials to graduates.</p>
        </div>
        <div className="registry-gate">
          {wrongNetwork
            ? 'Connect to the correct network to issue degrees.'
            : 'Registry not configured.'}
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section id="issue-degree">
        <div className="page-header">
          <h2>Issue Degree</h2>
          <p className="page-sub">Issue academic credentials to graduates.</p>
        </div>
        <div className="registry-gate">Loading...</div>
      </section>
    )
  }

  if (!isEducator) {
    return (
      <section id="issue-degree">
        <div className="page-header">
          <h2>Issue Degree</h2>
          <p className="page-sub">Issue academic credentials to graduates.</p>
        </div>
        <div className="registry-gate">
          You must be a verified educator to issue degrees.
        </div>
      </section>
    )
  }

  return (
    <section id="issue-degree">
      <div className="page-header">
        <h2>Issue Degree</h2>
        <p className="page-sub">
          Issue academic credentials to graduates. Connected as: {truncatedAddress} ({networkName})
        </p>
      </div>

      <form className="degree-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="graduateAddress">Graduate Wallet Address</label>
          <input
            id="graduateAddress"
            type="text"
            placeholder="0x..."
            value={graduateAddress}
            onChange={(e) => setGraduateAddress(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="degreeName">Degree Name</label>
          <input
            id="degreeName"
            type="text"
            placeholder="e.g., Bachelor of Science"
            value={degreeName}
            onChange={(e) => setDegreeName(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="graduationDate">Graduation Date</label>
          <input
            id="graduationDate"
            type="date"
            value={graduationDate}
            onChange={(e) => setGraduationDate(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="fieldOfStudy">Field of Study</label>
          <input
            id="fieldOfStudy"
            type="text"
            placeholder="e.g., Computer Science"
            value={fieldOfStudy}
            onChange={(e) => setFieldOfStudy(e.target.value)}
            className="form-input"
            required
          />
        </div>

        {formError && <div className="form-error">{formError}</div>}

        {success && (
          <div className="form-success">
            Degree issued successfully!
          </div>
        )}

        <button type="submit" className="btn-issue">
          Issue Degree
        </button>
      </form>
    </section>
  )
}
