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
		<div style={{ padding: 32, maxWidth: 520 }}>
			<h2>Your credentials</h2>
			{creds.length === 0 && <p>No credentials stored on this device.</p>}
			{creds.map(c => {
				const cred = c.credential ?? c
				return (
					<div key={cred.id} style={{ border: '1px solid #ccc', padding: 12, marginBottom: 8 }}>
						<strong>{cred.claim}</strong>
						<button onClick={() => share(cred.id)} style={{ marginLeft: 12 }}>
							Share with employer
						</button>
					</div>
				)
			})}
			{link && (
				<div style={{ marginTop: 16 }}>
					<p>Send this link to the employer:</p>
					<input readOnly value={link} style={{ width: '100%' }} onFocus={e => e.target.select()} />
				</div>
			)}
			{error && <p style={{ color: 'crimson' }}>{error}</p>}
		</div>
	)
}
