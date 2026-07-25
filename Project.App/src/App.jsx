import { Routes, Route, Link } from 'react-router-dom'
import { WalletConnect } from './components/WalletConnect'
import { useWallet } from './hooks/useWallet'
import { useAccreditation } from './hooks/useAccreditation'
import { LandingPage } from './pages/LandingPage'
import { RegistryPage } from './pages/RegistryPage'
import { IssueDegreePage } from './pages/IssueDegreePage'
import PocPage from './pages/POC.jsx'
import ClaimPage from './pages/ClaimPage.jsx'
import { VerifyPage } from './pages/VerifyPage'

function App() {
	const wallet = useWallet()
	const { isConnected } = wallet
	const { isAccredited } = useAccreditation(wallet)

	return (
		<div className="min-h-screen">
			<header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
				<Link to="/" className="flex items-center gap-2">
					<span className="h-2.5 w-2.5 rounded-full bg-lime-400" />
					<span className="text-sm font-semibold text-white">Degree</span>
				</Link>
				<nav className="flex items-center gap-6 text-sm">
					<Link to="/registry" className="text-zinc-400 transition hover:text-white">Universities</Link>
					<Link to="/verify" className="text-zinc-400 transition hover:text-white">Verify</Link>
					{isConnected && isAccredited && (
						<Link to="/issue-degree" className="text-zinc-400 transition hover:text-white">Issue Degree</Link>
					)}
				</nav>
				<WalletConnect />
			</header>

			<main className="mx-auto max-w-5xl px-6 pb-16">
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/registry" element={<RegistryPage />} />
					<Route path="/issue-degree" element={<IssueDegreePage />} />
					<Route path="/verify" element={<VerifyPage />} />
					<Route path='/poc' element={<PocPage />} />
					<Route path='/transfer' element={<ClaimPage />} />
				</Routes>
			</main>
		</div>
	)
}

export default App
