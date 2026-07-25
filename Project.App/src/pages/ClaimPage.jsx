import { useState } from 'react'
import { BrowserProvider } from 'ethers'
import { useWallet } from '../hooks/useWallet'
import { saveCredential } from '../lib/store'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ClaimPage() {
	const wallet = useWallet()
	const { isConnected, address } = wallet

	const [status, setStatus] = useState(() => {
		const token = new URLSearchParams(window.location.search).get('token')
		return token ? 'ready' : 'idle'
	})
	const [credential, setCredential] = useState(null)
	const [error, setError] = useState(() => {
		const token = new URLSearchParams(window.location.search).get('token')
		return token ? '' : 'No claim token provided'
	})

	const handleClaim = async () => {
		const token = new URLSearchParams(window.location.search).get('token')
		if (!token) {
			setStatus('error')
			setError('No claim token provided')
			return
		}

		setStatus('loading')
		setError('')

		try {
			const message = `Claim credential for token: ${token}`
			const provider = new BrowserProvider(window.ethereum)
			const signer = await provider.getSigner()
			const signature = await signer.signMessage(message)

			const res = await fetch(`${API}/claim/${token}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ address, signature }),
			})

			if (!res.ok) {
				const data = await res.json().catch(() => null)
				throw new Error(data?.error || 'Failed to claim credential')
			}

			const bundle = await res.json()
			await saveCredential(bundle)
			setCredential(bundle.credential)
			setStatus('saved')
		} catch (e) {
			setStatus('error')
			if (e.code === 'ACTION_REJECTED') {
				setError('Signature request was rejected')
			} else {
				setError(e.message || 'Failed to claim credential')
			}
		}
	}

	if (status === 'idle') {
		return (
			<section className="mx-auto max-w-lg">
				<div className="card mt-6 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-950/40">
						<svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 className="text-lg font-semibold text-white">Invalid Link</h2>
					<p className="mt-2 text-sm text-zinc-400">{error}</p>
				</div>
			</section>
		)
	}

	if (!isConnected) {
		return (
			<section className="mx-auto max-w-lg">
				<div className="card mt-6 text-center">
					<h2 className="text-lg font-semibold text-white">Claim Your Credential</h2>
					<p className="mt-2 text-sm text-zinc-400">
						Connect your wallet to verify ownership and claim your degree.
					</p>
				</div>
			</section>
		)
	}

	if (status === 'loading') {
		return (
			<section className="mx-auto max-w-lg">
				<div className="card mt-6 text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
					<p className="text-zinc-400">Claiming your credential...</p>
				</div>
			</section>
		)
	}

	if (status === 'error') {
		return (
			<section className="mx-auto max-w-lg">
				<div className="card mt-6 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-950/40">
						<svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 className="text-lg font-semibold text-white">Claim Failed</h2>
					<p className="mt-2 text-sm text-zinc-400">{error}</p>
					<button onClick={handleClaim} className="btn-primary mt-4">
						Try Again
					</button>
				</div>
			</section>
		)
	}

	if (status === 'saved') {
		return (
			<section className="mx-auto max-w-lg">
				<div className="card mt-6">
					<div className="text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-lime-950/40">
							<svg className="h-6 w-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-white">Credential Claimed!</h2>
						<p className="mt-1 text-sm text-zinc-400">Your degree has been saved to this device.</p>
					</div>

					{credential && (
						<div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
							<dl className="space-y-3 text-sm">
								<div>
									<dt className="text-zinc-500">Degree</dt>
									<dd className="font-medium text-white">{credential.degreeName}</dd>
								</div>
								<div>
									<dt className="text-zinc-500">Field of Study</dt>
									<dd className="font-medium text-white">{credential.fieldOfStudy}</dd>
								</div>
								<div>
									<dt className="text-zinc-500">Graduation Date</dt>
									<dd className="font-medium text-white">{credential.graduationDate}</dd>
								</div>
								<div>
									<dt className="text-zinc-500">Issued By</dt>
									<dd className="font-mono text-xs text-zinc-300">{credential.issuer}</dd>
								</div>
							</dl>
						</div>
					)}
				</div>
			</section>
		)
	}

	return (
		<div style={{ padding: 32 }}>
			{status === 'loading' && <p>Loading your credential…</p>}
			{status === 'saved' && <p>✓ Credential saved to this device.</p>}
			{status !== 'loading' && status !== 'saved' && <p style={{ color: 'crimson' }}>{status}</p>}
		</div>
	)
}