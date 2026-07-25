import { BrowserProvider } from 'ethers'
import { listCredentials } from './store'

const API = import.meta.env.VITE_API_URL

export async function createShareLink(credentialId) {
	// 1) load the credential this graduate is presenting
	const all = await listCredentials()
	const stored = all.find(c => c.id === credentialId || c.credential?.id === credentialId)
	if (!stored) throw new Error('credential not found on this device')
	const { credential, signature: credentialSignature } = stored

	// 2) connect wallet + get a nonce to prove ownership live
	const provider = new BrowserProvider(window.ethereum)
	await provider.send('eth_requestAccounts', [])
	const signer = await provider.getSigner()

	const { nonce } = await fetch(`${API}/present/nonce`).then(r => r.json())

	// 3) sign the nonce → proves control of the subject wallet
	const holderSignature = await signer.signMessage(
		`Verify credential ${credential.id} with nonce ${nonce}`
	)

	// 4) bundle + POST, receive the shareable link
	const presentation = { credential, credentialSignature, nonce, holderSignature }
	const { shareUrl } = await fetch(`${API}/present`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ presentation }),
	}).then(r => r.json())

	return shareUrl
}
