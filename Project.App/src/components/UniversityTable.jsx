import { useState } from "react";

const PAGE_SIZE = 10;

function truncateAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function UniversityTable({ universities, address }) {
  const [page, setPage] = useState(0);

  if (universities.length === 0) {
    return (
      <div className="card text-center text-sm text-on-surface-variant">
        No accredited universities yet. Institutions appear here once the DAO
        votes their accreditation through.
      </div>
    );
  }

  const pageCount = Math.max(1, Math.ceil(universities.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = universities.slice(start, start + PAGE_SIZE);

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container-high text-left font-label text-xs uppercase tracking-wide text-on-surface-variant">
            <th className="px-6 py-3 font-medium">Address</th>
            <th className="px-4 py-3 font-medium">Institution</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium">Since</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((uni) => {
            const isYou =
              address && uni.address.toLowerCase() === address.toLowerCase();
            return (
              <tr
                key={uni.address}
                className={`border-b border-surface-container-high last:border-0 ${
                  isYou
                    ? "border-l-4 border-l-primary bg-primary-container/5"
                    : ""
                }`}
              >
                <td
                  className="px-6 py-3 font-mono text-xs text-on-surface-variant"
                  title={uni.address}
                >
                  {truncateAddr(uni.address)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-on-surface">
                      {uni.name}
                    </span>
                    {isYou && (
                      <span className="rounded-full bg-primary-container/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                        You
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {uni.country || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-primary-container/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                    Accredited
                  </span>
                </td>
                <td className="px-6 py-3 text-on-surface-variant">
                  {uni.since ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-surface-container-high bg-surface-container-low px-6 py-3 text-xs text-on-surface-variant">
        <span>
          Showing {visible.length} of {universities.length} accredited educators
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            aria-label="Previous page"
            className="flex h-7 w-7 items-center justify-center rounded text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="flex h-7 min-w-7 items-center justify-center rounded bg-surface-container-highest px-2 font-label font-semibold text-on-surface">
            {currentPage + 1}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            aria-label="Next page"
            className="flex h-7 w-7 items-center justify-center rounded text-on-surface-variant transition-colors hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
