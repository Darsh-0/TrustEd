import { Routes, Route, Link } from 'react-router-dom'
import { WalletConnect } from './components/WalletConnect'
import { useWallet } from './hooks/useWallet'
import { useAccreditation } from './hooks/useAccreditation'
import { RegistryPage } from './pages/RegistryPage'
import { IssueDegreePage } from './pages/IssueDegreePage'
import './App.css'

function App() {
  const wallet = useWallet()
  const { isConnected } = wallet
  const { isAccredited } = useAccreditation(wallet)

  return (
    <>
      <header id="app-header">
        <div className="brand">
          <div className="brand-dot" />
          <span className="brand-name">Accreditation Registry</span>
        </div>
        <nav className="nav-links">
          <Link to="/" className="nav-link">Registry</Link>
          {isConnected && isAccredited && (
            <Link to="/issue-degree" className="nav-link">Issue Degree</Link>
          )}
        </nav>
        <WalletConnect wallet={wallet} />
      </header>

      <Routes>
        <Route path="/" element={<RegistryPage />} />
        <Route path="/issue-degree" element={<IssueDegreePage />} />
      </Routes>
    </>
  )
}

export default App
