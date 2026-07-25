import { useState } from 'react'
import { BrowserProvider } from 'ethers'
import { useWallet } from '../hooks/useWallet'
import { proveOwnership } from '../lib/auth'

export default function PocPage() {
	const { isConnected, isConnecting, connect, truncatedAddress, hasWallet } = useWallet()
	const [status, setStatus] = useState('idle') // idle | signing | verified | error
	const [verified, setVerified] = useState(null)
	const [error, setError] = useState(null)

	async function handleProve() {
		setStatus('signing'); setError(null)
		try {
			const provider = new BrowserProvider(window.ethereum)
			const signer = await provider.getSigner()      // reuses connection, no prompt
			const addr = await proveOwnership(signer)       // triggers the sign prompt
			setVerified(addr); setStatus('verified')
		} catch (e) {
			setError(e.code === 4001 ? 'Signature rejected.' : e.message)
			setStatus('error')
		}
	}

	if (!hasWallet) return <p>Install MetaMask to try this.</p>

	return (
		<div style={{ padding: 32, fontFamily: 'system-ui' }}>
			<h1>Wallet ownership PoC</h1>

			{!isConnected ? (
				<button onClick={connect} disabled={isConnecting}>
					{isConnecting ? 'Connecting…' : 'Connect wallet'}
				</button>
			) : (
				<>
					<p>Connected: {truncatedAddress}</p>
					<button onClick={handleProve} disabled={status === 'signing'}>
						{status === 'signing' ? 'Waiting for signature…' : 'Prove ownership'}
					</button>
				</>
			)}

			{status === 'verified' && <p style={{ color: 'green' }}>✓ Server verified {verified}</p>}
			{error && <p style={{ color: 'crimson' }}>{error}</p>}
		</div>
	)
}
