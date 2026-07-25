import { Router } from 'express'
import { ethers } from 'ethers'
import { randomBytes } from 'crypto'
import { getUniversity } from '../dao.js'


const nonces = new Map()
const presentations = new Map()


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

// ── Presentation flow (graduate shares → employer verifies) ──

interface Credential {
	id: string
	issuer: string
	graduate: string
	degreeName: string
	fieldOfStudy: string
	graduationDate: string
	issuedAt: number
}

interface Presentation {
	credential: Credential
	credentialSignature: string
	nonce: string
	holderSignature: string
}

const PRESENT_NONCE_TTL_MS = 10 * 60 * 1000  // 10 min to build+share
const SHARE_TTL_MS = 24 * 60 * 60 * 1000     // link valid 24h

// 1) Graduate's device asks for a nonce to sign
authRouter.get('/present/nonce', (_req, res) => {
	const nonce = randomBytes(16).toString('hex')
	nonces.set(nonce, Date.now() + PRESENT_NONCE_TTL_MS)
	res.json({ nonce })
})

// 2) Graduate posts the built presentation, gets a share token
authRouter.post('/present', (req, res) => {
	const { presentation } = req.body ?? {}
	if (!presentation?.nonce || !nonces.has(presentation.nonce)) {
		return res.status(400).json({ error: 'invalid nonce' })
	}
	const token = randomBytes(24).toString('hex')
	presentations.set(token, { presentation, expires: Date.now() + SHARE_TTL_MS })
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
	res.json({ shareUrl: `${frontendUrl}/verify?token=${token}` })
})

// 3) Employer opens the link → redeem + run the five checks
authRouter.get('/redeem/:token', async (req, res) => {
	const entry = presentations.get(req.params.token)

	if (!entry || Date.now() > entry.expires) {
		return res.status(404).json({ error: 'link invalid or expired' })
	}

	if (entry.result) {
		return res.json(entry.result)
	}

	const result = await verifyPresentation(entry.presentation)

	entry.result = result                   // cache the verdict
	entry.expires = Date.now() + 60_000     // 60s grace window for repeat reads

	// Burn the nonce on successful use — replay protection.
	if (result.ok) {
		nonces.delete(entry.presentation.nonce)
	}


	res.json(result)
})

async function verifyPresentation(p: Presentation) {
	// 0. validate presentation structure
	if (!p?.credential || !p.credential.graduate || !p.credential.issuer) {
		return { ok: false, reason: 'invalid presentation structure' }
	}

	// 1. nonce we issued, still valid
	const nonceExpires = nonces.get(p.nonce)
	if (!nonceExpires || Date.now() > nonceExpires) {
		return { ok: false, reason: 'nonce invalid or expired' }
	}

	// 2. sharer controls the graduate wallet
	const holderMsg = `Verify credential ${p.credential.id} with nonce ${p.nonce}`
	let holder: string
	try { holder = ethers.verifyMessage(holderMsg, p.holderSignature).toLowerCase() }
	catch { return { ok: false, reason: 'malformed holder signature' } }
	if (holder !== p.credential.graduate.toLowerCase()) {
		return { ok: false, reason: 'sharer does not control this credential' }
	}

	// 3. university's signature on the credential is valid
	const credMsg = JSON.stringify(p.credential)
	let issuer: string
	try { issuer = ethers.verifyMessage(credMsg, p.credentialSignature).toLowerCase() }
	catch { return { ok: false, reason: 'malformed credential signature' } }
	if (issuer !== p.credential.issuer.toLowerCase()) {
		return { ok: false, reason: 'credential signature does not match issuer' }
	}

	// 4. issuer is DAO-accredited — fetch the full record for name/country/status
	let university
	try {
		university = await getUniversity(issuer)
	} catch {
		return { ok: false, reason: 'issuer is not registered with the DAO' }
	}

	if (!university.accredited) {
		return {
			ok: false,
			reason: university.status === 'Revoked'
				? `accreditation of ${university.name} has been revoked`
				: `issuer is not accredited (status: ${university.status})`,
			university: { name: university.name, country: university.country, status: university.status },
		}
	}

	// all checks passed
	return {
		ok: true,
		degree: {
			name: p.credential.degreeName,
			fieldOfStudy: p.credential.fieldOfStudy,
			graduationDate: p.credential.graduationDate,
			issuedAt: new Date(Number(p.credential.issuedAt) * 1000).toISOString(),
		},
		university: {
			name: university.name,
			country: university.country,
			address: university.address,
			accreditedSince: university.lastUpdated,
		},
		graduate: {
			address: holder,
		},
	}
}
