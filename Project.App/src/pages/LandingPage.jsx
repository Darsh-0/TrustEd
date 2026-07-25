import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const fraudStats = [
  {
    value: "35%",
    text: "of Associate's degrees presented to employers are falsely claimed.",
    source: "Attewell & Domina, 2011",
  },
  {
    value: "6%",
    text: "of Bachelor's degrees are falsely claimed.",
    source: "Attewell & Domina, 2011",
  },
  {
    value: "7,600+",
    text: "fraudulent nursing diplomas sold in one U.S. scheme.",
    source: "DOJ indictment, Miami",
  },
  {
    value: "44%",
    text: "of UK CVs reviewed had education discrepancies.",
    source: "UK CV audit",
  },
  {
    value: "10%",
    text: "of UK CVs reviewed had false grades.",
    source: "UK CV audit",
  },
  {
    value: "7 weeks",
    text: "was all one NZ job applicant attended before claiming a bachelor's degree.",
    source: "NZQA",
  },
];

const sampleRecipients = [
  "Darsh Gandhi",
  "Ed Leonard",
  "Reuben Donnison",
  "Sienna Robinson",
  "Siegfried",
  "nistorv",
];

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
  const recipient = useMemo(
    () => sampleRecipients[Math.floor(Math.random() * sampleRecipients.length)],
    []
  );

  const [statIndex, setStatIndex] = useState(0);
  const [statVisible, setStatVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setStatVisible(false);
      setTimeout(() => {
        setStatIndex((i) => (i + 1) % fraudStats.length);
        setStatVisible(true);
      }, 400);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const stat = fraudStats[statIndex];

  return (
    <div className="bg-surface text-on-surface">
      {/* Hero */}
      <section className="mx-auto max-w-container px-6 pb-20 pt-14 sm:px-10 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="font-headline text-4xl font-extrabold leading-[1.1] tracking-tight text-on-surface sm:text-5xl">
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
                Share Credentials
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
              <div className="flex h-64 flex-col items-center justify-center overflow-hidden bg-surface-container-lowest px-8 text-center">
                <div
                  className={`flex w-full flex-col items-center gap-3 transition-opacity duration-[400ms] ease-in-out ${
                    statVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <p className="font-headline text-5xl font-extrabold leading-none text-on-surface">
                    {stat.value}
                  </p>
                  <p className="mx-auto max-w-[220px] text-sm text-on-surface-variant">
                    {stat.text}
                  </p>
                  <p className="text-xs text-on-surface-variant/70">
                    {stat.source}
                  </p>
                </div>
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
              <div className="mt-6 space-y-1">
                <p className="font-headline text-base font-bold text-on-surface">
                  Bachelor of Software Engineering
                </p>
                <p className="text-sm text-on-surface-variant">
                  University of Auckland
                </p>
                <p className="text-sm text-on-surface-variant">
                  Awarded to {recipient}
                </p>
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
              Credentials proven, privacy preserved.
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
                    </span>{" "}
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
              Stop fake degrees before they reach a hiring desk.
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
