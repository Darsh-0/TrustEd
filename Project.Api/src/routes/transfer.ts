import { Router } from 'express'
import { ethers } from 'ethers'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

export const transferRouter = Router()

const pending = new Map() // token -> { credential, signature, expires }

async function sendEmail(email: string, credential: any, link: string) {
	const resend = new Resend(process.env.RESEND_API_KEY)
	const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev'
	const text = `You've been issued a degree!

Degree: ${credential.degreeName}
Field: ${credential.fieldOfStudy}
Graduation Date: ${credential.graduationDate}
Issued by: ${credential.issuer}

Claim your credential:
${link}

This link expires in 7 days and can only be used once.`

	try {
		await resend.emails.send({
			from: `Degree <${fromEmail}>`,
			to: email,
			subject: 'You have a new degree credential to claim',
			text,
		})
	} catch (err) {
		console.error('Failed to send email:', err)
	}
}

// 1) Issuer's browser posts the SIGNED credential after MetaMask signing
transferRouter.post('/issue', async (req, res) => {
	const { credential, signature, email } = req.body

	if (!credential || !signature || !email) {
		return res.status(400).json({ error: 'credential, signature, and email are required' })
	}

	const message = JSON.stringify(credential)
	const recovered = ethers.verifyMessage(message, signature)

	if (recovered.toLowerCase() !== credential.issuer?.toLowerCase()) {
		return res.status(401).json({ error: 'signature does not match issuer' })
	}

	const token = randomBytes(24).toString('hex')
	const link = `http://localhost:5173/claim?token=${token}`
	pending.set(token, { credential, signature, expires: Date.now() + 7 * 864e5 }) // 7 days
	
	await sendEmail(email, credential, link)
	
	res.json({ ok: true })
})

// 2) Graduate's browser fetches by token, then it's burned
transferRouter.get('/claim/:token', (req, res) => {
	const item = pending.get(req.params.token)
	if (!item || Date.now() > item.expires) return res.status(404).json({ error: 'invalid or expired' })
	pending.delete(req.params.token) // single-use pickup
	res.json({ credential: item.credential, signature: item.signature })
})
