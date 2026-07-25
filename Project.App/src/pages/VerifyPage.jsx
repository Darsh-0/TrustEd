import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL

export default function VerifyPage() {
	const [result, setResult] = useState({ state: 'loading' })

	useEffect(() => {
		const token = new URLSearchParams(window.location.search).get('token')
		if (!token) return setResult({ state: 'error', reason: 'no token in link' })

		fetch(`${API}/redeem/${token}`)
			.then(r => r.json())
			.then(data => setResult({ state: 'done', ...data }))
			.catch(() => setResult({ state: 'error', reason: 'could not reach server' }))
	}, [])

	if (result.state === 'loading') return <p style={{ padding: 32 }}>Verifying…</p>

	return (
		<div style={{ padding: 32, maxWidth: 520 }}>
			<h2>Credential verification</h2>
			{result.ok ? (
				<div style={{ color: 'green' }}>
					<p style={{ fontSize: 20 }}>✓ Verified</p>
					<p><strong>Degree:</strong> {result.degree}</p>
					<p><strong>Issued by (accredited):</strong> {result.issuer}</p>
					<p><strong>Held by wallet:</strong> {result.holder}</p>
					<p><strong>Issued at:</strong> {result.issuedAt}</p>
				</div>
			) : (
				<div style={{ color: 'crimson' }}>
					<p style={{ fontSize: 20 }}>✗ Not verified</p>
					<p>{result.reason}</p>
				</div>
			)}
		</div>
	)
}
