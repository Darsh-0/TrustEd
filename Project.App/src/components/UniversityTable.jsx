import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

function truncateAddr(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function UniversityTable({ universities, address }) {
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [page, setPage] = useState(0);

  if (universities.length === 0) {
    return (
      <div className="card text-center text-sm text-on-surface-variant">
        No accredited universities yet. Institutions appear here once the DAO
        votes their accreditation through.
      </div>
    );
  }

  const countries = useMemo(() => {
    const set = new Set(universities.map((uni) => uni.country).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [universities]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return universities.filter((uni) => {
      const matchesQuery =
        !query ||
        [uni.name, uni.country, uni.address].some((field) =>
          field?.toLowerCase().includes(query),
        );
      const matchesCountry = country === "All" || uni.country === country;
      return matchesQuery && matchesCountry;
    });
  }, [universities, search, country]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="mb-4 rounded-lg bg-surface-container-low p-4">
        <p className="label mb-2">Filter Registry</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
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
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search institutions..."
              aria-label="Search accredited educators"
              className="input bg-surface-container-lowest pl-9"
            />
          </div>

          <div className="relative sm:w-48">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c1.657 0 3-4.03 3-9s-1.343-9-3-9-3 4.03-3 9 1.343 9 3 9zm-9-9h18"
              />
            </svg>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(0);
              }}
              aria-label="Filter by country"
              className="input appearance-none bg-surface-container-lowest pl-9 pr-9"
            >
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Countries" : c}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

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
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-sm text-on-surface-variant"
                >
                  No institutions match these filters.
                </td>
              </tr>
            )}
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
            Showing {visible.length} of {filtered.length} accredited educators
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
    </div>
  );
}
