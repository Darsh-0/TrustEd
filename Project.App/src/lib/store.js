// src/lib/store.js — tiny IndexedDB wrapper (or use the `idb` npm package)
import { openDB } from 'idb'

const db = () => openDB('credentials', 1, {
	upgrade(d) { d.createObjectStore('creds', { keyPath: 'id' }) },
})

export async function saveCredential(bundle) {
	const id = bundle.credential.id ?? crypto.randomUUID()
	await (await db()).put('creds', { id, ...bundle })
	return id
}

export async function listCredentials() {
	return (await db()).getAll('creds')
}

export async function getCredential(id) {
	return (await db()).get('creds', id)
}

export async function getCredentialsByAddress(address) {
	const all = await listCredentials()
	const lower = address.toLowerCase()
	return all.filter(c => {
		const graduate = c.credential?.graduate
		return graduate && graduate.toLowerCase() === lower
	})
}
