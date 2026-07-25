import { useState, useEffect, useCallback, useMemo } from 'react'
import UniversityRegistryABI from '../abi/UniversityRegistry.json'
import { BrowserProvider, Contract, JsonRpcProvider, ZeroAddress } from 'ethers'

const REGISTRY_ADDRESS = import.meta.env.VITE_UNIVERSITY_REGISTRY_ADDRESS
const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_REGISTRY_CHAIN_ID ?? 31337)
const RPC_URL = import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545'

/// Mirrors UniversityRegistry.Status in the DAO contract.
const STATUS_ACCREDITED = 2

function parseError(err) {
	return err?.shortMessage ?? err?.reason ?? err?.info?.error?.message ?? err?.message ?? 'Unknown error'
}

function formatDate(timestamp) {
	if (!timestamp || timestamp === 0n) return null
	return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

/// Reads the DAO's UniversityRegistry. Accreditation is decided by ministry votes
/// inside the DAO — this app only consumes the outcome, it never writes to it.
export function useAccreditation(wallet) {
	const { address, chainId, isConnected } = wallet

	const notConfigured = !REGISTRY_ADDRESS || REGISTRY_ADDRESS === ZeroAddress
	const wrongNetwork = isConnected && chainId !== EXPECTED_CHAIN_ID

	// One state object so the effect settles everything in a single update.
	const [state, setState] = useState({
		universities: [],
		isAccredited: false,
		loading: !notConfigured,
		error: null,
	})

	// The directory is public data, so read it over plain RPC — no wallet required.
	// Fall back to the injected provider when no RPC URL is reachable.
	const contract = useMemo(() => {
		if (notConfigured) return null
		const provider = RPC_URL
			? new JsonRpcProvider(RPC_URL)
			: window.ethereum
				? new BrowserProvider(window.ethereum)
				: null
		if (!provider) return null
		return new Contract(REGISTRY_ADDRESS, UniversityRegistryABI, provider)
	}, [notConfigured])


	const MULTICALL3 = '0xcA11bde05977b3631167028862bE2a173976CA11'
	const MULTICALL3_ABI = [
		'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[])',
	]

	const load = useCallback(async () => {
		if (!contract) return { universities: [], isAccredited: false }

		const provider = contract.runner.provider
		const iface = contract.interface
		const multicall = new Contract(MULTICALL3, MULTICALL3_ABI, provider)

		// 1. count + your own accreditation, in parallel
		const [count, isAccredited] = await Promise.all([
			contract.applicantCount().then(Number),
			address ? contract.isAccredited(address) : Promise.resolve(false),
		])
		if (count === 0) return { universities: [], isAccredited }

		// 2. all applicantAt(i) in ONE call
		const addrCalls = Array.from({ length: count }, (_, i) => ({
			target: REGISTRY_ADDRESS,
			allowFailure: false,
			callData: iface.encodeFunctionData('applicantAt', [i]),
		}))
		const addrResults = await multicall.aggregate3(addrCalls)
		const addresses = addrResults.map(
			(r) => iface.decodeFunctionResult('applicantAt', r.returnData)[0]
		)

		// 3. all getUniversity(addr) in ONE call
		const uniCalls = addresses.map((addr) => ({
			target: REGISTRY_ADDRESS,
			allowFailure: false,
			callData: iface.encodeFunctionData('getUniversity', [addr]),
		}))
		const uniResults = await multicall.aggregate3(uniCalls)

		const records = uniResults.map((r, i) => {
			const u = iface.decodeFunctionResult('getUniversity', r.returnData)[0]
			return {
				address: addresses[i],
				name: u.name,
				country: u.country,
				keyType: u.keyType,
				publicKey: u.publicKey,
				accredited: Number(u.status) === STATUS_ACCREDITED,
				since: formatDate(u.lastUpdated),
			}
		})

		return {
			universities: records.filter((u) => u.accredited),
			isAccredited,
		}
	}, [contract, address]);

	useEffect(() => {
		// Nothing to read from — the empty initial state is already the right answer.
		if (!contract) return

		let cancelled = false

		load()
			.then((result) => {
				if (!cancelled) setState({ ...result, loading: false, error: null })
			})
			.catch((err) => {
				if (!cancelled) {
					setState({
						universities: [],
						isAccredited: false,
						loading: false,
						error: parseError(err),
					})
				}
			})

		return () => { cancelled = true }
	}, [contract, load])

	return {
		universities: state.universities,
		count: state.universities.length,
		isAccredited: state.isAccredited,
		loading: state.loading,
		error: state.error,
		notConfigured,
		wrongNetwork,
	}
}
