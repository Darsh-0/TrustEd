import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useRegistry } from '../hooks/useRegistry'
import { EducatorStatus } from '../components/EducatorStatus'
import { AddIssuerForm } from '../components/AddIssuerForm'
import { RegistryTable } from '../components/RegistryTable'

export function RegistryPage() {
	const wallet = useWallet()
	const { isConnected, networkName, truncatedAddress } = wallet
	const registry = useRegistry(wallet)
	const { count, isEducator, isOwner, loading, error, txPending, notConfigured, wrongNetwork, educators, addEducator, removeEducator } = registry

	const [showAddForm, setShowAddForm] = useState(false)

	return (
		<>
			<section id="hero">
				<div className="hero-left">
					<p className="hero-eyebrow">On-chain · Credentials · Trust</p>
					<h1>
						Verified
						<br />
						Educator
						<br />
						Registry
					</h1>
					<p className="hero-sub">
						A permanent on-chain registry of trusted educational institutions.
						Issue and verify academic credentials anyone can check.
					</p>
				</div>

				<div className="hero-right">
					{isConnected ? (
						<div className="conn-card">
							<div className="conn-card-head">
								<span className="live-dot" />
								<span className="conn-label">Connected</span>
							</div>
							<div className="conn-address">{truncatedAddress}</div>
							<span className="conn-network">{networkName}</span>
							<div className="conn-divider" />
							<div className="conn-stats">
								<div className="conn-stat">
									<span className="conn-stat-val">{count}</span>
									<span className="conn-stat-key">Issuers</span>
								</div>
								<div className="conn-stat">
									<span className="conn-stat-val">{count}</span>
									<span className="conn-stat-key">Active</span>
								</div>
							</div>
							<EducatorStatus isEducator={isEducator} loading={loading} error={error} />
							<button className="btn-disconnect" onClick={wallet.disconnect}>
								Disconnect
							</button>
						</div>
					) : (
						<p className="hero-prompt">
							Connect your wallet above to interact with the registry.
						</p>
					)}
				</div>
			</section>

			{wrongNetwork && (
				<div className="network-banner">
					Wrong network — you're on {networkName}. Please switch to the local Hardhat network (chain 31337).
					<button className="btn-switch-network" onClick={() => wallet.switchNetwork(31337)}>
						Switch Network
					</button>
				</div>
			)}

			{notConfigured && (
				<div className="network-banner">
					Registry not configured — set VITE_REGISTRY_ADDRESS in .env
				</div>
			)}

			<section id="registry">
				<div className="registry-bar">
					<div className="bar-left">
						<span className="bar-title">Issuer Directory</span>
						<span className="bar-count">{count} registered</span>
					</div>
					{isConnected && isOwner && !wrongNetwork && (
						<button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
							{showAddForm ? 'Cancel' : '+ Add Issuer'}
						</button>
					)}
				</div>

				{showAddForm && isOwner && (
					<AddIssuerForm
						onAdd={addEducator}
						pending={txPending}
						onClose={() => setShowAddForm(false)}
					/>
				)}

				{isConnected && !wrongNetwork && !notConfigured ? (
					<div className="registry-table">
						<div className="table-head">
							<span>Address</span>
							<span>Name</span>
							<span>Status</span>
							<span>Registered</span>
							<span>Actions</span>
						</div>
						<RegistryTable
							educators={educators}
							isOwner={isOwner}
							onRemove={removeEducator}
							pending={txPending}
						/>
					</div>
				) : (
					<div className="registry-gate">
						{isConnected
							? 'Connect to the correct network to view the directory.'
							: 'Connect your wallet to view the issuer directory.'}
					</div>
				)}
			</section>
		</>
	)
}
