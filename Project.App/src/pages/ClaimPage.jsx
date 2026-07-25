import { useEffect, useState } from 'react'
import { saveCredential } from '../lib/store'

const API = import.meta.env.VITE_API_URL

export default function ClaimPage() {
	const [status, setStatus] = useState('loading')

	useEffect(() => {
		const token = new URLSearchParams(window.location.search).get('token')
		if (!token) { setStatus('no token'); return }

		fetch(`${API}/claim/${token}`)
			.then(r => r.ok ? r.json() : Promise.reject('invalid or expired link'))
			.then(async (bundle) => { await saveCredential(bundle); setStatus('saved') })
			.catch((e) => setStatus(String(e)))
	}, [])

	return (
		<div style={{ padding: 32 }}>
			{status === 'loading' && <p>Loading your credential…</p>}
			{status === 'saved' && <p>✓ Credential saved to this device.</p>}
			{status !== 'loading' && status !== 'saved' && <p style={{ color: 'crimson' }}>{status}</p>}
		</div>
	)
}
