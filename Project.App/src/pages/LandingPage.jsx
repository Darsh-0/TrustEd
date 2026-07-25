import { Link } from "react-router-dom";
import studentNormal from "../assets/hero.png";

export function LandingPage() {
  return (
    <div className="max-h-screen bg-white text-neutral-900">
      <section className="flex flex-col items-center px-6 pb-24 pt-12 text-center sm:pt-16">
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-7xl">
          Immutable academic credentials.
        </h1>

        <div className="relative mt-14 h-64 w-64 sm:h-80 sm:w-80">
          <img
            src={studentNormal}
            alt="Graduate"
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>

        <div className="mt-14 flex items-center gap-4">
          <Link
            to="/issue-degree"
            className="rounded-lg bg-[#17463C] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0f332b]"
          >
            Issue Degree
          </Link>
          <Link
            to="/share"
            className="rounded-lg border border-[#17463C] px-6 py-3 text-sm font-semibold text-[#17463C] transition-colors hover:bg-[#17463C]/5"
          >
            Share
          </Link>
        </div>
      </section>
    </div>
  );
}
