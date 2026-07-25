import { Routes, Route, Link, NavLink } from "react-router-dom";
import { WalletConnect } from "./components/WalletConnect";
import { useWallet } from "./hooks/useWallet";
import { useAccreditation } from "./hooks/useAccreditation";
import { LandingPage } from "./pages/LandingPage";
import { RegistryPage } from "./pages/RegistryPage";
import { IssueDegreePage } from "./pages/IssueDegreePage";
import ClaimPage from "./pages/ClaimPage.jsx";
import VerifyPage from "./pages/VerifyPage";
import SharePage from "./pages/SharePage.jsx";
import { useEffect, useState } from "react";

const navLinkClass = ({ isActive }) =>
  `nav-link ${isActive ? "nav-link-active" : ""}`;

function App() {
  const wallet = useWallet();
  const { isConnected, address } = wallet;
  const { isAccredited } = useAccreditation(wallet);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;
  }, [isConnected, address]);

  return (
    <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface">
      <header className="sticky top-0 z-50 border-b border-surface-container-high bg-surface/90 backdrop-blur">
        <div className="mx-auto max-w-container px-6 py-4 sm:px-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-10">
              <Link
                to="/"
                className="font-headline text-xl font-extrabold tracking-tight text-on-surface"
              >
                TrustEd
              </Link>

              {/* Desktop nav */}
              <nav className="hidden items-center gap-8 md:flex">
                <NavLink to="/registry" className={navLinkClass}>
                  Educators
                </NavLink>

                <NavLink to="/share" className={navLinkClass}>
                  Share
                </NavLink>

                {isConnected && isAccredited && (
                  <NavLink to="/issue-degree" className={navLinkClass}>
                    Issue Degree
                  </NavLink>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* Hide wallet on very small screens */}
              <div className="hidden md:block">
                <WalletConnect />
              </div>

              {/* Hamburger */}
              <button
                className="md:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {menuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="mt-4 flex flex-col gap-4 border-t pt-4 md:hidden">
              <NavLink
                to="/registry"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Educators
              </NavLink>

              <NavLink
                to="/share"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Share
              </NavLink>

              {isConnected && isAccredited && (
                <NavLink
                  to="/issue-degree"
                  className={navLinkClass}
                  onClick={() => setMenuOpen(false)}
                >
                  Issue Degree
                </NavLink>
              )}

              <WalletConnect />
            </div>
          )}
        </div>
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/registry" element={<RegistryPage />} />
          <Route path="/issue-degree" element={<IssueDegreePage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/claim" element={<ClaimPage />} />
        </Routes>
      </main>

      <footer className="border-t border-surface-container-high">
        <div className="mx-auto flex w-full max-w-container items-center justify-between gap-4 px-6 py-8 text-sm text-on-surface-variant sm:px-10">
          <span className="font-headline text-xl font-extrabold tracking-tight text-on-surface">
            TrustEd
          </span>
          <span>© {new Date().getFullYear()}. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
export default App;
