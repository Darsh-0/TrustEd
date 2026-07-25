import { Link } from "react-router-dom";

const problems = [
  {
    title: "Manual Bottlenecks",
    description:
      "Verifying a degree today means phone calls, emails, and trusting paperwork that can be forged or lost.",
    icon: (
      <svg
        className="h-5 w-5 text-on-error-container"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5a2 2 0 012-2h2.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
        />
      </svg>
    ),
  },
  {
    title: "Credential Forgery",
    description:
      "Fake credentials aren't just an HR problem - they put sensitive systems in the hands of unverified staff.",
    icon: (
      <svg
        className="h-5 w-5 text-on-error-container"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12.75L11.25 15 15 9.75M21 12c0 4.556-3.04 8.4-7.2 9.62a1.5 1.5 0 01-1.6 0C7.04 20.4 4 16.556 4 12V6.6a1.5 1.5 0 011.026-1.423l6.5-2.222a1.5 1.5 0 01.948 0l6.5 2.222A1.5 1.5 0 0121 6.6V12z"
        />
      </svg>
    ),
  },
  {
    title: "Data Vulnerability",
    description:
      "Centralized registries are honey-pots for hackers, exposing personal graduate data unnecessarily.",
    icon: (
      <svg
        className="h-5 w-5 text-on-error-container"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
        />
      </svg>
    ),
  },
];

const highlights = [
  {
    title: "Regional Compliance:",
    description: "Aligned with NZ and global standards.",
  },
  {
    title: "Instant Validation:",
    description: "Millisecond response time, 100% accuracy.",
  },
];

export function LandingPage() {
  return (
    <div className="bg-surface text-on-surface">
      {/* Hero */}
      <section className="mx-auto max-w-container px-6 pb-20 pt-14 sm:px-10 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-container/10 px-3 py-1.5 font-label text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              DAO-Verified Network
            </span>

            <h1 className="mt-6 font-headline text-4xl font-extrabold leading-[1.1] tracking-tight text-on-surface sm:text-5xl">
              Immutable academic credentials.
            </h1>

            <p className="mt-4 max-w-md text-base text-on-surface-variant">
              A decentralized, DAO-verified credential registry that proves your
              degree is real without exposing your data.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/registry" className="btn-primary">
                See Educators
              </Link>
              <Link to="/share" className="btn-outline">
                Share
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-low shadow-ambient">
              <div className="flex items-center gap-2 border-b border-surface-container-highest bg-surface-container-lowest px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
                <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
                <span className="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
                <span className="ml-3 h-5 flex-1 rounded bg-surface-container" />
              </div>
              <div className="flex flex-col items-center justify-center gap-3 bg-surface-container-lowest px-8 py-14 text-center">
                <p className="font-headline text-5xl font-extrabold leading-none text-on-surface">
                  35%
                </p>
                <p className="max-w-[220px] text-sm text-on-surface-variant">
                  of associate degrees presented to employers are fake.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-container px-6 pb-24 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-headline text-3xl font-bold text-on-surface">
            The Problem: Broken Verification
          </h2>
          <p className="mt-3 text-sm text-on-surface-variant">
            Traditional verification systems are slow, manual, and prone to
            human error or manipulation.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {problems.map((problem) => (
            <div key={problem.title} className="card">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-container">
                {problem.icon}
              </div>
              <h3 className="mt-4 font-headline text-lg font-bold text-on-surface">
                {problem.title}
              </h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* DAO-verified */}
      <section className="bg-surface-container-low py-20">
        <div className="mx-auto grid max-w-container items-center gap-12 px-6 sm:px-10 lg:grid-cols-2">
          <div className="relative">
            <div className="card">
              <div className="flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container/20 text-primary">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l9-5-9-5-9 5 9 5z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l6.16-3.42A12.083 12.083 0 0112 21a12.083 12.083 0 01-6.16-10.42L12 14z"
                    />
                  </svg>
                </span>
                <span className="rounded-full bg-primary-container/10 px-2.5 py-1 font-label text-[10px] font-semibold text-primary">
                  VERIFIED
                </span>
              </div>
              <div className="mt-6 space-y-2">
                <div className="h-3 w-3/4 rounded bg-surface-container-highest" />
                <div className="h-3 w-full rounded bg-surface-container-highest" />
                <div className="h-3 w-1/2 rounded bg-surface-container-highest" />
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-surface-container-highest pt-4 text-xs text-on-surface-variant">
                <span>Verified Dec 2023</span>
                <span className="font-semibold text-on-surface">
                  DAO Sign-off
                </span>
              </div>
            </div>
            <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-lg border border-surface-container-highest bg-surface-container-lowest px-3 py-2 shadow-ambient">
              <svg
                className="h-4 w-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span className="font-label text-xs font-semibold text-on-surface">
                Privacy-First
              </span>
            </div>
          </div>

          <div>
            <h2 className="font-headline text-3xl font-bold leading-tight text-on-surface">
              DAO-Verified. Privacy-Preserving.
            </h2>
            <p className="mt-4 text-sm text-on-surface-variant">
              Built for graduates, universities, and employers. Solving degree
              fraud globally and privately, starting with New Zealand.
            </p>
            <p className="mt-3 text-sm text-on-surface-variant">
              Our project removes the need for a single trusted authority to
              vouch for anything. Instead, a decentralized network of
              institutions collectively validates the cryptographic proof of
              achievement.
            </p>

            <ul className="mt-6 space-y-3">
              {highlights.map((item) => (
                <li key={item.title} className="flex items-start gap-3 text-sm">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-on-surface-variant">
                    <span className="font-semibold text-on-surface">
                      {item.title}
                    </span>
                    {item.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-container px-6 py-20 sm:px-10">
        <div className="relative overflow-hidden rounded-xl bg-primary px-6 py-16 text-center sm:px-16">
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-headline text-3xl font-bold leading-tight text-on-primary sm:text-4xl">
              The future of academic integrity starts here.
            </h2>
            <p className="mt-4 text-sm text-inverse-primary">
              Join the growing network of universities securing the future for
              their graduates.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link to="/registry" className="btn-primary-inverse">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
