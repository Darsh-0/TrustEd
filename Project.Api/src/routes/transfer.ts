import { Router } from 'express'
import { ethers } from 'ethers'
import { randomBytes } from 'crypto'

export const transferRouter = Router()

const pending = new Map() // token -> { credential, signature, expires }

function sendEmail(email: string, link: string) {
	console.log(`\n📧 Claim link for ${email}:\n${link}\n`)
}

// 1) Issuer's browser posts the SIGNED credential after MetaMask signing
transferRouter.post('/issue', (req, res) => {
	const { credential, signature, email } = req.body
	// (optionally verify the signature here before accepting)
	const token = randomBytes(24).toString('hex')
	pending.set(token, { credential, signature, expires: Date.now() + 7 * 864e5 }) // 7 days
	sendEmail(email, `http://localhost:5173/claim?token=${token}`) // your email provider
	res.json({ ok: true })
})

// 2) Graduate's browser fetches by token, then it's burned
transferRouter.get('/claim/:token', (req, res) => {
	const item = pending.get(req.params.token)
	if (!item || Date.now() > item.expires) return res.status(404).json({ error: 'invalid or expired' })
	pending.delete(req.params.token) // single-use pickup
	res.json({ credential: item.credential, signature: item.signature })
})
