import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL

export default function VerifyPage() {
	const [result, setResult] = useState(() => {
		const token = new URLSearchParams(window.location.search).get('token')
		return token ? { state: 'loading' } : { state: 'error', reason: 'no token in link' }
	})

	useEffect(() => {
		if (result.state !== 'loading') return
		const token = new URLSearchParams(window.location.search).get('token')
		if (!token) return

		fetch(`${API}/redeem/${token}`)
			.then(r => r.json())
			.then(data => setResult({ state: 'done', ...data }))
			.catch(() => setResult({ state: 'error', reason: 'could not reach server' }))
	}, [result.state])

	return (
		<div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
			<div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-10 shadow-sm">
				{result.state === 'loading' && (
					<>
						<div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-[#17463C]" />
						<h2 className="mt-6 text-xl font-bold text-neutral-900">
							Verifying credential
						</h2>
						<p className="mt-2 text-sm text-neutral-500">
							Checking the record against the chain…
						</p>
					</>
				)}

				{result.state !== 'loading' && result.ok && (
					<>
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#17463C]">
							<svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
								<path d="M20 6 9 17l-5-5" />
							</svg>
						</div>
						<h2 className="mt-6 text-xl font-bold text-neutral-900">Verified</h2>

						<dl className="mt-6 space-y-3 text-left text-sm">
							<div className="flex justify-between gap-4 border-b border-neutral-100 pb-3">
								<dt className="font-medium text-neutral-500">Degree</dt>
								<dd className="text-right font-semibold text-neutral-900">{result.degree}</dd>
							</div>
							<div className="flex justify-between gap-4 border-b border-neutral-100 pb-3">
								<dt className="font-medium text-neutral-500">Issued by (accredited)</dt>
								<dd className="text-right font-semibold text-neutral-900">{result.issuer}</dd>
							</div>
							<div className="flex justify-between gap-4 border-b border-neutral-100 pb-3">
								<dt className="font-medium text-neutral-500">Held by wallet</dt>
								<dd className="text-right font-mono text-xs text-neutral-900">{result.holder}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt className="font-medium text-neutral-500">Issued at</dt>
								<dd className="text-right font-semibold text-neutral-900">{result.issuedAt}</dd>
							</div>
						</dl>
					</>
				)}

				{result.state !== 'loading' && !result.ok && (
					<>
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
							<svg viewBox="0 0 24 24" className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
								<path d="M18 6 6 18M6 6l12 12" />
							</svg>
						</div>
						<h2 className="mt-6 text-xl font-bold text-neutral-900">Not verified</h2>
						<p className="mt-2 text-sm text-red-600">{result.reason}</p>
						<p className="mt-4 text-sm text-neutral-500">
							The link may be invalid or expired — ask the credential holder to
							generate a new sharing link.
						</p>
					</>
				)}
			</div>
		</div>
	)
}