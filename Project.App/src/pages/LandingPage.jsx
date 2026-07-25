import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="mb-4 text-xs font-medium uppercase tracking-widest text-lime-400">
        On-chain · Credentials · Trust
      </p>
      <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-white sm:text-6xl">
        Issue and verify academic degrees
      </h1>
      <p className="mt-6 max-w-xl text-lg text-zinc-400">
        A trusted on-chain registry of accredited educators. Verified
        institutions issue degrees to graduates — anyone can verify.
      </p>
      <div className="mt-10 flex items-center gap-4">
        <Link to="/issue-degree" className="btn-primary">
          Issue Degree
        </Link>
        <Link to="/verify" className="btn-outline">
          Verify Degree
        </Link>
      </div>
    </section>
  )
}
