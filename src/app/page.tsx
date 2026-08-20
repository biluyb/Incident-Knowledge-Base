"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBox } from "@/components/ui/SearchBox";

interface Group {
  code: string;
  name: string;
  ticket_count: number;
}

const exampleQueries = [
  "LIMIT EXPIRED",
  "AA.SCHEDULED.ACTIVITY",
  "TSR-3183311",
  "COB crashed",
  "catch-all",
];

export default function HomePage() {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-12 py-8">
      {/* Hero — search-focused per SRS §22 */}
      <div className="text-center space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          T24 Incident Knowledge Archive
        </h1>
        <p className="text-gray-500 text-lg">
          Find a previous solution.
        </p>
        <div className="max-w-2xl mx-auto">
          <SearchBox size="lg" placeholder="Search TSR, error, module, record..." />
        </div>

        {/* Example queries */}
        <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
          <span className="text-xs text-gray-400 self-center mr-1">Try:</span>
          {exampleQueries.map((q) => (
            <Link
              key={q}
              href={`/search?q=${encodeURIComponent(q)}`}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            >
              {q}
            </Link>
          ))}
        </div>
      </div>

      {/* Browse Groups — per SRS §17 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Groups</h2>
        {groups.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {groups.map((g) => (
              <Link
                key={g.code}
                href={`/groups/${g.code}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-md transition-all text-center group"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 font-bold text-lg rounded-lg group-hover:bg-blue-200 transition-colors">
                  {g.code}
                </span>
                <p className="text-xs text-gray-600 mt-2 leading-tight line-clamp-2">
                  {g.name}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {g.ticket_count} incident{g.ticket_count !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">Import the Excel workbook to populate the archive.</p>
          </div>
        )}
      </div>
    </div>
  );
}
