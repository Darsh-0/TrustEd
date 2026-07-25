// src/hooks/useAuth.js
import { useState, useCallback } from 'react'
import { BrowserProvider } from 'ethers'
import { proveOwnership } from '../lib/auth'

export function useAuth() {
	const [status, setStatus] = useState('idle') // idle | signing | verified | error
	const [verifiedAddress, setVerifiedAddress] = useState(null)
	const [error, setError] = useState(null)

	const authenticate = useCallback(async () => {
		setStatus('signing')
		setError(null)
		try {
			const provider = new BrowserProvider(window.ethereum)
			const signer = await provider.getSigner()   // reuses existing connection, no prompt
			const addr = await proveOwnership(signer)
			setVerifiedAddress(addr)
			setStatus('verified')
			return addr
		} catch (err) {
			setError(err.code === 4001 ? 'Signature rejected.' : err.message)
			setStatus('error')
		}
	}, [])

	return { status, verifiedAddress, error, authenticate }
}
