import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

function CopyIcon({ className }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<rect x="8" y="8" width="14" height="14" rx="2" ry="2" />
			<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
		</svg>
	)
}

function CheckIcon({ className }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	)
}

function AddressChip({ address, truncatedAddress }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(address)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}

	return (
		<>
			<span
				onClick={handleCopy}
				title={copied ? "Copied!" : "Click to copy"}
				className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700 cursor-pointer hover:border-neutral-400 inline-flex gap-4 select-none"
			>
				{truncatedAddress}
				{copied
					? <CheckIcon className="h-3.5 w-3.5 text-green-600" />
					: <CopyIcon className="h-3.5 w-3.5 text-neutral-400" />}
			</span>

			{copied && (
				<span className="absolute top-14 left-3/4 rounded bg-neutral-800 px-2 py-1 text-xs text-white">
					Copied!
				</span>
			)}
		</>
	)
}

export function WalletConnect() {
	const {
		truncatedAddress,
		address,
		isConnecting,
		isConnected,
		hasWallet,
		error,
		connect,
		disconnect,
	} = useWallet()

	if (!hasWallet) {
		return (
			<a
				href="https://metamask.io/download/"
				target="_blank"
				rel="noopener noreferrer"
				className="btn-outline"
			>
				Install MetaMask
			</a>
		)
	}

	return (
		<div className="flex items-center gap-3">
			{error && <span className="text-xs text-red-600">{error}</span>}
			{isConnected ? (
				<>
					<AddressChip address={address} truncatedAddress={truncatedAddress} />
					<button className="btn-outline" onClick={disconnect}>
						Disconnect
					</button>
				</>
			) : (
				<button className="btn-primary cursor-pointer" onClick={connect} disabled={isConnecting}>
					{isConnecting ? 'Connecting...' : 'Connect Wallet'}
				</button>
			)
			}
		</div >
	)
}
