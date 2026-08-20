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
    <div className="space-y-10 py-6">
      {/* Hero — search-focused */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--primary)" }}>
          Tsehay Bank Incident Knowledge Base
        </h1>
        <p className="text-gray-500">
          Find a previous solution.
        </p>
        <div className="max-w-2xl mx-auto">
          <SearchBox size="lg" placeholder="Search TSR, error, module, record..." />
        </div>
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

      {/* Browse Groups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Browse Knowledge Domains</h2>
          <Link
            href="/incidents/new"
            className="btn-primary text-xs"
          >
            + Add Incident
          </Link>
        </div>
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {groups.map((g) => (
              <Link
                key={g.code}
                href={`/groups/${g.code}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                <h3 className="font-medium text-gray-900 group-hover:text-[var(--primary)] transition-colors text-sm leading-tight">
                  {g.name}
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  {g.ticket_count} incident{g.ticket_count !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 text-sm">Import the Excel workbook to populate the archive.</p>
          </div>
        )}
      </div>
    </div>
  );
}
