import { useEffect, useState } from 'react'
import { listCredentials } from '../lib/store'
import { createShareLink } from '../lib/present'

export default function SharePage() {
	const [creds, setCreds] = useState([])
	const [link, setLink] = useState(null)
	const [error, setError] = useState(null)

	useEffect(() => { listCredentials().then(setCreds) }, [])

	async function share(id) {
		setError(null); setLink(null)
		try { setLink(await createShareLink(id)) }
		catch (e) { setError(e.code === 4001 ? 'Signature rejected.' : e.message) }
	}

	return (
		<section className="mx-auto max-w-lg px-6 py-12">
			<h2 className="text-2xl font-bold text-neutral-900">Your credentials</h2>
			<p className="mt-1 text-sm text-neutral-500">
				Share verified degrees with employers via a one-time link.
			</p>

			{creds.length === 0 && (
				<div className="card mt-6 text-center text-sm text-neutral-500">
					No credentials stored on this device.
				</div>
			)}

			{creds.length > 0 && (
				<div className="mt-6 space-y-3">
					{creds.map(c => {
						const cred = c.credential ?? c
						return (
							<div key={cred.id} className="card flex items-center justify-between gap-4">
								<span className="font-medium text-neutral-900">{cred.claim ?? cred.degreeName ?? 'Credential'}</span>
								<button onClick={() => share(cred.id)} className="btn-outline">
									Share with employer
								</button>
							</div>
						)
					})}
				</div>
			)}

			{link && (
				<div className="card mt-4">
					<p className="mb-2 text-sm font-medium text-neutral-900">Send this link to the employer:</p>
					<input
						readOnly
						value={link}
						className="input"
						onFocus={e => e.target.select()}
					/>
				</div>
			)}

			{error && (
				<p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
					{error}
				</p>
			)}
		</section>
	)
}
