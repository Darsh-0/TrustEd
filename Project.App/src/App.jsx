import { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { WalletConnect } from "./components/WalletConnect";
import { useWallet } from "./hooks/useWallet";
import { useAccreditation } from "./hooks/useAccreditation";
import { getCredentialsByAddress } from "./lib/store";
import { LandingPage } from "./pages/LandingPage";
import { RegistryPage } from "./pages/RegistryPage";
import { IssueDegreePage } from "./pages/IssueDegreePage";
import PocPage from "./pages/POC.jsx";
import ClaimPage from "./pages/ClaimPage.jsx";
import VerifyPage from "./pages/VerifyPage";
import SharePage from "./pages/SharePage.jsx";
import logo from "./assets/logo_full_transparent.png";

function App() {
  const wallet = useWallet();
  const { isConnected, address } = wallet;
  const { isAccredited } = useAccreditation(wallet);
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;
    let cancelled = false;
    getCredentialsByAddress(address).then(creds => {
      if (!cancelled) setHasCredentials(creds.length > 0);
    });
    return () => { cancelled = true; };
  }, [isConnected, address]);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-2">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="TrustEd" className="h-14 w-auto" />
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm font-medium text-neutral-800 sm:flex">
            <Link to="/registry" className="hover:text-[#17463C]">
              Educators
            </Link>
            {isConnected && hasCredentials && (
              <Link to="/share" className="hover:text-[#17463C]">
                Share
              </Link>
            )}
            {isConnected && isAccredited && (
              <Link to="/issue-degree" className="hover:text-[#17463C]">
                Issue Degree
              </Link>
            )}
          </nav>

          <WalletConnect />
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/registry" element={<RegistryPage />} />
          <Route path="/issue-degree" element={<IssueDegreePage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/poc" element={<PocPage />} />
          <Route path="/claim" element={<ClaimPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
