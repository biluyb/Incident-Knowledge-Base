"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/keywords")
      .then((r) => r.json())
      .then(setKeywords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = keywords.filter(
    (kw) =>
      kw.keyword.toLowerCase().includes(search.toLowerCase()) ||
      (kw.group_code && kw.group_code.toLowerCase().includes(search.toLowerCase()))
  );

  // Group keywords by group
  const grouped = filtered.reduce((acc: Record<string, any[]>, kw) => {
    const group = kw.group_code || "Unassigned";
    if (!acc[group]) acc[group] = [];
    acc[group].push(kw);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quick Lookup</h1>
        <p className="text-sm text-gray-500 mt-1">
          {keywords.length} keyword-to-group mappings for fast incident triage
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search keywords..."
        className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-white"
      />

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-4">🔑</div>
          <p className="text-lg text-gray-600">No keywords found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupCode, kws]) => (
            <div key={groupCode} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                {groupCode !== "Unassigned" ? (
                  <Link
                    href={`/groups/${groupCode}`}
                    className="text-sm font-bold hover:underline"
                  >
                    Group {groupCode}
                  </Link>
                ) : (
                  <span className="text-sm font-bold text-gray-400">Unassigned</span>
                )}
                <span className="text-xs text-gray-400">({kws.length} keywords)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {kws.map((kw) => (
                  <Link
                    key={kw.id}
                    href={`/search?q=${encodeURIComponent(kw.keyword)}`}
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors border border-gray-200 hover:bg-gray-100"
                  >
                    {kw.keyword}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
