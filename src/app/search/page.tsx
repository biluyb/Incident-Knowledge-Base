"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SearchBox } from "@/components/ui/SearchBox";
import { Badge } from "@/components/ui/Badge";
import type { SearchResult } from "@/lib/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const groupFilter = searchParams.get("group") || "";
  const priorityFilter = searchParams.get("priority") || "";
  const severityFilter = searchParams.get("severity") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [groups, setGroups] = useState<{code: string; name: string}[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error);
  }, []);

  const doSearch = useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q });
      if (groupFilter) params.set("group", groupFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (severityFilter) params.set("severity", severityFilter);

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [q, groupFilter, priorityFilter, severityFilter]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Search</h1>

      <SearchBox initialQuery={q} size="sm" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={groupFilter}
          onChange={(e) => updateFilter("group", e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g.code} value={g.code}>{g.name}</option>
          ))}
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => updateFilter("priority", e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => updateFilter("severity", e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Severities</option>
          <option value="1">Severity 1</option>
          <option value="2">Severity 2</option>
          <option value="3">Severity 3</option>
          <option value="4">Severity 4</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-32" />
          ))}
        </div>
      ) : q && results.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-lg text-gray-600 font-medium">No matching knowledge found.</p>
          <p className="text-sm text-gray-400 mt-2">Try: T24 record name, error message, TSR number, keyword, module name</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-gray-500">{total} result{total !== 1 ? "s" : ""} found</p>
          <div className="space-y-4">
            {results.map((r, idx) => (
              <div
                key={`${r.type}-${r.id}-${idx}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={r.type === "knowledge" ? "published" : ""}>
                        {r.type === "knowledge" ? "Knowledge Article" : "Ticket"}
                      </Badge>
                      {r.group_code && (
                        <span className="text-xs text-gray-500">{r.group_name || r.group_code}</span>
                      )}
                      {r.subtype_code && (
                        <span className="text-xs text-gray-400">· {r.subtype_code}</span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mt-1">
                      {r.type === "ticket" ? (
                        <Link href={`/incidents/${r.id}`} className="hover:text-blue-600">
                          {r.title}
                        </Link>
                      ) : (
                        <Link href={`/knowledge/${r.id}`} className="hover:text-blue-600">
                          {r.title}
                        </Link>
                      )}
                    </h3>
                    {r.summary && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {r.severity && <Badge>{r.severity}</Badge>}
                      {r.priority && <Badge variant={r.priority.toLowerCase()}>{r.priority}</Badge>}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {r.type === "knowledge" ? (
                      <Link
                        href={`/knowledge/${r.id}`}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Article
                      </Link>
                    ) : (
                      <Link
                        href={`/incidents/${r.id}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        View Incident
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
