const API = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

// Accepts an already-connected ethers signer (from useWallet's provider).
// Does NOT reconnect — connection is useWallet's job.
export async function proveOwnership(signer) {
	// 1) Address the connected wallet is claiming.
	const address = (await signer.getAddress()).toLowerCase()

	// 2) Get the challenge message from the server.
	const { message } = await fetch(`${API}/auth/nonce?address=${address}`)
		.then((r) => r.json())

	// 3) Sign it (personal_sign under the hood; EIP-191 prefix handled by ethers).
	//    This still triggers the MetaMask signature prompt — that's the intended UX.
	const signature = await signer.signMessage(message)

	// 4) Post it back for verification.
	const result = await fetch(`${API}/auth/verify`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ address, signature }),
	}).then((r) => r.json())

	if (!result.ok) throw new Error(result.error ?? 'verification failed')
	return result.address
}
