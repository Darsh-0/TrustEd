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
			<section className="flex min-h-[70vh] items-center justify-center px-6">
				<div className="card w-full max-w-lg text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
						<svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 className="text-lg font-bold text-neutral-900">Invalid Link</h2>
					<p className="mt-2 text-sm text-neutral-500">{error}</p>
				</div>
			</section>
		)
	}

	if (!isConnected) {
		return (
			<section className="flex min-h-[70vh] items-center justify-center px-6">
				<div className="card w-full max-w-lg text-center">
					<h2 className="text-lg font-bold text-neutral-900">Claim Your Credential</h2>
					<p className="mt-2 text-sm text-neutral-500">
						Connect your wallet to verify ownership and claim your degree.
					</p>
				</div>
			</section>
		)
	}

	if (status === 'loading') {
		return (
			<section className="flex min-h-[70vh] items-center justify-center px-6">
				<div className="card w-full max-w-lg text-center">
					<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-[#17463C]" />
					<p className="text-sm text-neutral-500">Claiming your credential...</p>
				</div>
			</section>
		)
	}

	if (status === 'error') {
		return (
			<section className="flex min-h-[70vh] items-center justify-center px-6">
				<div className="card w-full max-w-lg text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
						<svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 className="text-lg font-bold text-neutral-900">Claim Failed</h2>
					<p className="mt-2 text-sm text-red-600">{error}</p>
					<button onClick={handleClaim} className="btn-primary mt-4">
						Try Again
					</button>
				</div>
			</section>
		)
	}

	if (status === 'saved') {
		return (
			<section className="flex min-h-[70vh] items-center justify-center px-6">
				<div className="card w-full max-w-lg">
					<div className="text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#17463C]/10">
							<svg className="h-6 w-6 text-[#17463C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<h2 className="text-lg font-bold text-neutral-900">Credential Claimed!</h2>
						<p className="mt-1 text-sm text-neutral-500">Your degree has been saved to this device.</p>
					</div>

					{credential && (
						<div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
							<dl className="space-y-3 text-sm">
								<div>
									<dt className="text-neutral-500">Degree</dt>
									<dd className="font-medium text-neutral-900">{credential.degreeName}</dd>
								</div>
								<div>
									<dt className="text-neutral-500">Field of Study</dt>
									<dd className="font-medium text-neutral-900">{credential.fieldOfStudy}</dd>
								</div>
								<div>
									<dt className="text-neutral-500">Graduation Date</dt>
									<dd className="font-medium text-neutral-900">{credential.graduationDate}</dd>
								</div>
								<div>
									<dt className="text-neutral-500">Issued By</dt>
									<dd className="font-mono text-xs text-neutral-700">{credential.issuer}</dd>
								</div>
							</dl>
						</div>
					)}
				</div>
			</section>
		)
	}

	return (
		<section className="flex min-h-[70vh] items-center justify-center px-6">
			<div className="card w-full max-w-lg text-center">
				<h2 className="text-lg font-bold text-neutral-900">Claim Your Credential</h2>
				<p className="mt-2 text-sm text-neutral-500">
					Sign a message to prove you own this wallet, then claim your degree.
				</p>
				<button onClick={handleClaim} className="btn-primary mt-4">
					Claim Credential
				</button>
			</div>
		</section>
	)
}
