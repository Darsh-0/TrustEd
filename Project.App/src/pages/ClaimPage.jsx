import { useEffect, useState } from 'react'
import { saveCredential } from '../lib/store'

const API = import.meta.env.VITE_API_URL

export default function ClaimPage() {
	const [status, setStatus] = useState(() => {
		const token = new URLSearchParams(window.location.search).get('token')
		return token ? 'loading' : 'no token'
	})

	useEffect(() => {
		if (status !== 'loading') return

		const token = new URLSearchParams(window.location.search).get('token')

		fetch(`${API}/claim/${token}`)
			.then(r => r.ok ? r.json() : Promise.reject('invalid or expired link'))
			.then(async (bundle) => { await saveCredential(bundle); setStatus('saved') })
			.catch((e) => setStatus(String(e)))
	}, [status])

	return (
		<div style={{ padding: 32 }}>
			{status === 'loading' && <p>Loading your credential…</p>}
			{status === 'saved' && <p>✓ Credential saved to this device.</p>}
			{status !== 'loading' && status !== 'saved' && <p style={{ color: 'crimson' }}>{status}</p>}
		</div>
	)
}
