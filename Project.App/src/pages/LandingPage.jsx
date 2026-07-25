import { Link } from 'react-router-dom'
import logo from '../assets/ChatGPT_Image_Jul_25_2026_03_49_07_PM.png'
import studentNormal from '../assets/normal.png'
import studentTicked from '../assets/Tick.png'
import { WalletConnect } from '../components/WalletConnect'

// TrustEd brand colours — primary deep green: #17463C

const FEATURES = [
  'Integrates automatically with university systems',
  'Decentralized identity for every graduate',
  'Tamper-proof blockchain validation',
  'Instant verification for global employers',
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* ── Top bar ─────────────────────────────────────────── */}
      

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex flex-col items-center px-6 pb-24 pt-12 text-center sm:pt-16">
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-7xl">
          Immutable academic credentials.
        </h1>

        {/* Verification animation: student appears, then gets ticked */}
        <div className="relative mt-14 h-64 w-64 sm:h-80 sm:w-80">
          <img
            src={studentNormal}
            alt="Graduate"
            className="absolute inset-0 h-full w-full object-contain"
          />
          <img
            src={studentTicked}
            alt="Verified graduate"
            className="verify-tick absolute inset-0 h-full w-full object-contain"
          />
        </div>

        {/* CTAs — same routes as the original page */}
        <div className="mt-14 flex items-center gap-4">
          <Link
            to="/issue-degree"
            className="rounded-lg bg-[#17463C] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0f332b]"
          >
            Issue Degree
          </Link>
          <Link
            to="/verify"
            className="rounded-lg border border-[#17463C] px-6 py-3 text-sm font-semibold text-[#17463C] transition-colors hover:bg-[#17463C]/5"
          >
            Verify Degree
          </Link>
        </div>

        {/* Feature lines */}
        <ul className="mt-16 space-y-3 text-sm font-semibold text-[#1b3a4b]">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}