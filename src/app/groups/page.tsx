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
        <h1 className="text-2xl font-bold text-gray-900">Incident Groups</h1>
        <p className="text-sm text-gray-500 mt-1">
          {groups.length} groups covering all T24/Temenos incident categories
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.code}`}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 font-bold text-lg rounded-lg">
                  {g.code}
                </span>
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                  {g.ticket_count} tickets
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-tight">
                {g.name}
              </h3>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>📝 {g.article_count} articles</span>
                <span>📂 {g.subtype_count} sub-types</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
