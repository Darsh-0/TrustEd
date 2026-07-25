import { Router } from 'express'
import { ethers } from 'ethers'
import { randomBytes } from 'crypto'

export const authRouter = Router()

// In-memory nonce store. Fine for a prototype; swap for Redis/DB in production.
// Keyed by address -> { nonce, expires }. One outstanding challenge per address.
const challenges = new Map<string, { nonce: string; expires: number }>()

const NONCE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// 1) Client asks for a challenge for the address they claim to control.
authRouter.get('/nonce', (req, res) => {
	const address = String(req.query.address || '').toLowerCase()

	if (!ethers.isAddress(address)) {
		return res.status(400).json({ error: 'invalid address' })
	}

	const nonce = randomBytes(16).toString('hex')
	challenges.set(address, { nonce, expires: Date.now() + NONCE_TTL_MS })

	// The full human-readable message the wallet will sign.
	// Binding domain + purpose + nonce prevents signatures being replayed elsewhere.
	const message = buildMessage(address, nonce)

	res.json({ message, nonce })
})

// 2) Client signs the message with personal_sign and posts it back.
authRouter.post('/verify', (req, res) => {
	const { address: rawAddress, signature } = req.body ?? {}
	const address = String(rawAddress || '').toLowerCase()

	if (!ethers.isAddress(address) || typeof signature !== 'string') {
		return res.status(400).json({ error: 'address and signature required' })
	}

	const challenge = challenges.get(address)
	if (!challenge) {
		return res.status(401).json({ error: 'no challenge issued for this address' })
	}
	if (Date.now() > challenge.expires) {
		challenges.delete(address)
		return res.status(401).json({ error: 'challenge expired' })
	}

	// Reconstruct the EXACT message the server issued and recover who signed it.
	const message = buildMessage(address, challenge.nonce)

	let recovered: string
	try {
		recovered = ethers.verifyMessage(message, signature).toLowerCase()
	} catch {
		return res.status(401).json({ error: 'malformed signature' })
	}

	if (recovered !== address) {
		return res.status(401).json({ error: 'signature does not match address' })
	}

	// Success: burn the nonce so it can't be reused.
	challenges.delete(address)

	// Here you'd issue a session token / JWT. Prototype: just confirm.
	res.json({ ok: true, address })
})

// Single source of truth for the signed message. Server and client must agree,
// but the client never builds it — it receives it from /nonce and signs verbatim.
function buildMessage(address: string, nonce: string): string {
	return [
		'Sign in to CredentialVerifier.',
		'',
		`Address: ${address}`,
		`Nonce: ${nonce}`,
	].join('\n')
}
