import { useWallet } from '../hooks/useWallet'

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
					<span className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 font-mono text-xs text-neutral-700 cursor-pointer hover:border-neutral-400"
						onClick={() => navigator.clipboard.writeText(address)} title="copy wallet address">
						{truncatedAddress}
					</span>
					<button className="btn-outline cursor-pointer" onClick={disconnect}>
						Disconnect
					</button>
				</>
			) : (
				<button className="btn-primary" onClick={connect} disabled={isConnecting}>
					{isConnecting ? 'Connecting...' : 'Connect Wallet'}
				</button>
			)}
		</div>
	)
}
