"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Group {
  id: number;
  code: string;
  name: string;
  description: string | null;
  ticket_count: number;
  article_count: number;
  subtype_count: number;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse incidents by technical domain.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.code}`}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-gray-900 group-hover:text-[var(--primary)] transition-colors text-sm leading-tight flex-1">
                  {g.name}
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 whitespace-nowrap flex-shrink-0">
                  {g.ticket_count}
                </span>
              </div>
              {g.description && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{g.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                {g.subtype_count > 0 && <span>{g.subtype_count} subgroups</span>}
                {g.article_count > 0 && <span>{g.article_count} articles</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
