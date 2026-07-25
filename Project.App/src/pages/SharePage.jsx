import { useEffect, useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { getCredentialsByAddress } from '../lib/store'
import { createShareLink } from '../lib/present'

export default function SharePage() {
	const { isConnected, address } = useWallet()
	const [creds, setCreds] = useState([])
	const [loading, setLoading] = useState(true)
	const [shareState, setShareState] = useState({})
	const [copiedId, setCopiedId] = useState(null)

	useEffect(() => {
		if (!isConnected || !address) return
		let cancelled = false
		getCredentialsByAddress(address)
			.then(creds => {
				if (!cancelled) setCreds(creds)
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})
		return () => { cancelled = true }
	}, [isConnected, address])

	async function share(id) {
		setShareState(prev => ({ ...prev, [id]: { loading: true, link: null, error: null } }))
		try {
			const link = await createShareLink(id)
			setShareState(prev => ({ ...prev, [id]: { loading: false, link, error: null } }))
		} catch (e) {
			const error = e.code === 4001 ? 'Signature rejected.' : e.message
			setShareState(prev => ({ ...prev, [id]: { loading: false, link: null, error } }))
		}
	}

	async function copy(id, link) {
		await navigator.clipboard.writeText(link)
		setCopiedId(id)
		setTimeout(() => setCopiedId(null), 2000)
	}

	if (!isConnected) {
		return (
			<section className="mx-auto max-w-lg px-6 py-12">
				<div className="card mt-6 text-center">
					<h2 className="text-lg font-semibold text-neutral-900">Share Your Credential</h2>
					<p className="mt-2 text-sm text-neutral-500">
						Connect your wallet to view and share your credentials.
					</p>
				</div>
			</section>
		)
	}

	return (
		<section className="mx-auto max-w-2xl px-6 py-12">
			<div>
				<h1 className="text-2xl font-bold text-neutral-900">Your Credentials</h1>
				<p className="mt-1 text-sm text-neutral-500">
					Generate a shareable verification link for employers.
				</p>
			</div>

			{loading && (
				<div className="card mt-6 text-center">
					<div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#17463C] border-t-transparent" />
				</div>
			)}

			{!loading && creds.length === 0 && (
				<div className="card mt-6 text-center">
					<p className="text-sm text-neutral-500">No credentials found for this wallet.</p>
				</div>
			)}

			{!loading && creds.map(c => {
				const cred = c.credential ?? c
				const id = c.id
				const state = shareState[id] || {}
				return (
					<div key={id} className="card mt-4">
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-neutral-500">Degree</dt>
								<dd className="font-medium text-neutral-900">{cred.degreeName}</dd>
							</div>
							<div>
								<dt className="text-neutral-500">Field of Study</dt>
								<dd className="text-neutral-700">{cred.fieldOfStudy}</dd>
							</div>
							<div>
								<dt className="text-neutral-500">Graduation Date</dt>
								<dd className="text-neutral-700">{cred.graduationDate}</dd>
							</div>
							<div>
								<dt className="text-neutral-500">Issuer</dt>
								<dd className="font-mono text-xs text-neutral-600">
									{cred.issuer?.slice(0, 6)}...{cred.issuer?.slice(-4)}
								</dd>
							</div>
						</dl>
						<button
							onClick={() => share(id)}
							disabled={state.loading}
							className="btn-primary mt-4 w-full"
						>
							{state.loading ? 'Signing...' : 'Share with employer'}
						</button>

						{state.link && (
							<div className="mt-4">
								<p className="mb-2 text-xs font-medium text-neutral-500">Share this link:</p>
								<div className="flex gap-2">
									<input
										readOnly
										value={state.link}
										className="input flex-1 font-mono text-xs"
										onFocus={e => e.target.select()}
									/>
									<button onClick={() => copy(id, state.link)} className="btn-outline whitespace-nowrap">
										{copiedId === id ? 'Copied!' : 'Copy'}
									</button>
								</div>
							</div>
						)}

						{state.error && (
							<p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
						)}
					</div>
				)
			})}
		</section>
	)
}
