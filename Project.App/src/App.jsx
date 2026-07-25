import { Routes, Route, Link } from 'react-router-dom'
import { WalletConnect } from './components/WalletConnect'
import { useWallet } from './hooks/useWallet'
import { useRegistry } from './hooks/useRegistry'
import { RegistryPage } from './pages/RegistryPage'
import { IssueDegreePage } from './pages/IssueDegreePage'
import PocPage from './pages/POC.jsx'
import ClaimPage from './pages/ClaimPage.jsx'
import './App.css'

function App() {
	const wallet = useWallet()
	const { isConnected } = wallet
	const { isEducator } = useRegistry(wallet)

	return (
		<>
			<header id="app-header">
				<div className="brand">
					<div className="brand-dot" />
					<span className="brand-name">IssuerRegistry</span>
				</div>
				<nav className="nav-links">
					<Link to="/" className="nav-link">Registry</Link>
					{isConnected && isEducator && (
						<Link to="/issue-degree" className="nav-link">Issue Degree</Link>
					)}
				</nav>
				<WalletConnect wallet={wallet} />
			</header>

			<Routes>
				<Route path="/" element={<RegistryPage />} />
				<Route path="/issue-degree" element={<IssueDegreePage />} />
				<Route path='/poc' element={<PocPage />} />
				<Route path='/transfer' element={<ClaimPage />} />
			</Routes>
		</>
	)
}

export default App
