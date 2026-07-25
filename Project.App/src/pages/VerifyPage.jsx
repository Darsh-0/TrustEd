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
		<div className="flex items-baseline justify-between gap-4 border-b border-zinc-800 py-2.5 last:border-0">
			<span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
			<span className={`text-right text-sm text-zinc-200 ${mono ? 'font-mono text-xs' : ''}`}>
				{value}
			</span>
		</div>
	)
}

export default function VerifyPage() {
	const [result, setResult] = useState({ state: 'loading' })
	const ran = useRef(false)

	useEffect(() => {
		if (ran.current) return // StrictMode fires effects twice in dev; redeem is single-use
		ran.current = true

		const token = new URLSearchParams(window.location.search).get('token')
		if (!token) {
			setResult({ state: 'done', ok: false, reason: 'This link is missing its verification token.' })
			return
		}

		fetch(`${API}/redeem/${token}`)
			.then(async (r) => {
				const data = await r.json().catch(() => null)
				if (!r.ok) throw new Error(data?.error || `Server error: ${r.status}`)
				return data
			})
			.then((data) => setResult({ state: 'done', ...data }))
			.catch((err) => setResult({ state: 'done', ok: false, reason: err.message }))
	}, [])

	const header = (
		<div className="text-center">
			<h2 className="text-2xl font-semibold text-white">Credential Verification</h2>
			<p className="mt-1 text-sm text-zinc-400">
				Checked against the DAO's registry of accredited institutions.
			</p>
		</div>
	)

	if (result.state === 'loading') {
		return (
			<section className="mx-auto max-w-lg">
				{header}
				<div className="card mt-6 space-y-3">
					<div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800" />
					<div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
					<div className="h-4 w-1/2 animate-pulse rounded bg-zinc-800" />
					<p className="pt-2 text-center text-sm text-zinc-500">Verifying signatures…</p>
				</div>
			</section>
		)
	}

	if (!result.ok) {
		return (
			<section className="mx-auto max-w-lg">
				{header}
				<div className="card mt-6 border-red-900/60 bg-red-950/20 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-900/60 bg-red-950/40 text-2xl text-red-400">
						✗
					</div>
					<p className="mt-3 text-lg font-semibold text-red-400">Not verified</p>
					<p className="mt-1 text-sm text-zinc-400">{result.reason}</p>

					{result.university && (
						<div className="mt-4 border-t border-zinc-800 pt-3 text-left">
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
		<section className="mx-auto max-w-lg">
			{header}

			<div className="card mt-6">
				<div className="border-b border-zinc-800 pb-4 text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-lime-900/60 bg-lime-950/40 text-2xl text-lime-400">
						✓
					</div>
					<p className="mt-3 text-lg font-semibold text-lime-400">Verified</p>
					<p className="mt-1 text-sm text-zinc-400">
						Issued by an accredited institution and held by the presenting wallet.
					</p>
				</div>

				<div className="pt-4">
					<h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Degree</h3>
					<Row label="Qualification" value={degree?.name} />
					<Row label="Field of study" value={degree?.fieldOfStudy} />
					<Row label="Graduated" value={formatDate(degree?.graduationDate)} />
					<Row label="Issued" value={formatDate(degree?.issuedAt)} />
				</div>

				<div className="pt-5">
					<h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Institution</h3>
					<Row label="Name" value={university?.name} />
					<Row label="Country" value={university?.country} />
					<Row label="Accredited since" value={formatDate(university?.accreditedSince)} />
					<Row label="Address" value={truncate(university?.address)} mono />
				</div>

				<div className="pt-5">
					<h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">Graduate</h3>
					<Row label="Wallet" value={truncate(graduate?.address)} mono />
				</div>
			</div>

			<p className="mt-4 text-center text-xs text-zinc-500">
				This link is single-use and expires shortly after verification.
			</p>
		</section>
	)
}
