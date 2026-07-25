import { useEffect, useRef, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const truncate = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—')

const formatDate = (value) => {
	if (!value) return '—'
	const d = new Date(value)
	return isNaN(d) ? value : d.toLocaleDateString(undefined, {
		year: 'numeric', month: 'long', day: 'numeric',
	})
}

function Row({ label, value, mono }) {
	return (
		<div className="flex items-baseline justify-between gap-4 border-b border-surface-container-high py-2.5 last:border-0">
			<span className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</span>
			<span className={`text-right text-sm text-on-surface ${mono ? 'font-mono text-xs' : ''}`}>
				{value}
			</span>
		</div>
	)
}

export default function VerifyPage() {
	const [result, setResult] = useState(() => {
		const token = new URLSearchParams(window.location.search).get('token')
		if (!token) return { state: 'done', ok: false, reason: 'This link is missing its verification token.' }
		return { state: 'loading' }
	})
	const ran = useRef(false)

	useEffect(() => {
		if (ran.current || result.state !== 'loading') return
		ran.current = true

		const token = new URLSearchParams(window.location.search).get('token')

		fetch(`${API}/redeem/${token}`)
			.then(async (r) => {
				const data = await r.json().catch(() => null)
				if (!r.ok) throw new Error(data?.error || `Server error: ${r.status}`)
				return data
			})
			.then((data) => setResult({ state: 'done', ...data }))
			.catch((err) => setResult({ state: 'done', ok: false, reason: err.message }))
	}, [result.state])

	const header = (
		<div className="text-center">
			<h2 className="font-headline text-2xl font-bold text-on-surface">Credential Verification</h2>
			<p className="mt-1 text-sm text-on-surface-variant">
				Checked against the DAO's registry of accredited institutions.
			</p>
		</div>
	)

	if (result.state === 'loading') {
		return (
			<section className="mx-auto max-w-lg px-6 py-12">
				{header}
				<div className="card mt-6 space-y-3">
					<div className="h-4 w-1/3 animate-pulse rounded bg-surface-container-highest" />
					<div className="h-4 w-2/3 animate-pulse rounded bg-surface-container-highest" />
					<div className="h-4 w-1/2 animate-pulse rounded bg-surface-container-highest" />
					<p className="pt-2 text-center text-sm text-on-surface-variant">Verifying signatures…</p>
				</div>
			</section>
		)
	}

	if (!result.ok) {
		return (
			<section className="mx-auto max-w-lg px-6 py-12">
				{header}
				<div className="card mt-6 border-error-container bg-error-container/30 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error-container text-2xl text-on-error-container">
						✗
					</div>
					<p className="mt-3 text-lg font-semibold text-on-error-container">Not verified</p>
					<p className="mt-1 text-sm text-on-surface-variant">{result.reason}</p>

					{result.university && (
						<div className="mt-4 border-t border-surface-container-high pt-3 text-left">
							<Row label="Institution" value={result.university.name} />
							<Row label="Registry status" value={result.university.status} />
						</div>
					)}
				</div>
			</section>
		)
	}

	const { degree, university, graduate } = result

	return (
		<section className="mx-auto max-w-lg px-6 py-12">
			{header}

			<div className="card mt-6">
				<div className="border-b border-surface-container-high pb-4 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-2xl text-on-primary">
						✓
					</div>
					<p className="mt-3 text-lg font-semibold text-primary">Verified</p>
					<p className="mt-1 text-sm text-on-surface-variant">
						Issued by an accredited institution and held by the presenting wallet.
					</p>
				</div>

				<div className="pt-4">
					<h3 className="mb-1 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Degree</h3>
					<Row label="Qualification" value={degree?.name} />
					<Row label="Field of study" value={degree?.fieldOfStudy} />
					<Row label="Graduated" value={formatDate(degree?.graduationDate)} />
					<Row label="Issued" value={formatDate(degree?.issuedAt)} />
				</div>

				<div className="pt-5">
					<h3 className="mb-1 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Institution</h3>
					<Row label="Name" value={university?.name} />
					<Row label="Country" value={university?.country} />
					<Row label="Accredited since" value={formatDate(university?.accreditedSince)} />
					<Row label="Address" value={truncate(university?.address)} mono />
				</div>

				<div className="pt-5">
					<h3 className="mb-1 font-label text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Graduate</h3>
					<Row label="Wallet" value={truncate(graduate?.address)} mono />
				</div>
			</div>

			<p className="mt-4 text-center text-xs text-on-surface-variant">
				This link is single-use and expires shortly after verification.
			</p>
		</section>
	)
}
