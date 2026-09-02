"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SearchBox } from "@/components/ui/SearchBox";
import type { SearchResult } from "@/lib/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const groupFilter = searchParams.get("group") || "";

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

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [q, groupFilter]);

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-sm text-gray-500 mt-1">Search incidents, errors, routines, solutions...</p>
      </div>

      <SearchBox initialQuery={q} size="sm" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={groupFilter}
          onChange={(e) => updateFilter("group", e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
        >
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g.code} value={g.code}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : q && results.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 font-medium">No matching knowledge found</p>
          <p className="text-sm text-gray-400 mt-2">Try: T24 record name, error message, TSR number, keyword, module name</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-gray-500">{total} result{total !== 1 ? "s" : ""} found</p>
          <div className="space-y-3">
            {results.map((r, idx) => (
              <div
                key={`${r.type}-${r.id}-${idx}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        r.type === "knowledge" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}>
                        {r.type === "knowledge" ? "Knowledge Article" : "Incident"}
                      </span>

                      {/* Knowledge Completeness Indicator */}
                      {r.knowledge_completeness === "full" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Knowledge Available
                        </span>
                      )}
                      {r.knowledge_completeness === "partial" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          ◐ Partial Knowledge
                        </span>
                      )}
                      {r.knowledge_completeness === "none" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                          ○ No Details
                        </span>
                      )}

                      {/* Match Reason Tag */}
                      {r.match_reason_label && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          {r.match_reason_label}
                        </span>
                      )}

                      {r.group_code && (
                        <span className="text-xs text-gray-500">{r.group_name || r.group_code}</span>
                      )}
                      {r.subtype_code && (
                        <span className="text-xs text-gray-400">· {r.subtype_code}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mt-1">
                      {r.type === "ticket" ? (
                        <Link href={`/incidents/${r.id}`} className="hover:underline font-semibold" style={{ color: "var(--primary)" }}>
                          {r.title}
                        </Link>
                      ) : (
                        <Link href={`/knowledge/${r.id}`} className="hover:underline font-semibold" style={{ color: "var(--primary)" }}>
                          {r.title}
                        </Link>
                      )}
                    </h3>
                    {r.summary && (
                      <p className="text-xs text-gray-600 mt-1">{r.summary}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {r.type === "knowledge" ? (
                      <Link href={`/knowledge/${r.id}`} className="btn-primary text-xs">
                        View Article
                      </Link>
                    ) : (
                      <Link href={`/incidents/${r.id}`} className="btn-secondary text-xs">
                        View Incident
                      </Link>
                    )}
                  </div>
                </div>

                {/* Short Snippet Preview */}
                {r.snippet && r.snippet.text && (
                  <div className="bg-gray-50 rounded border border-gray-100 p-2 text-xs text-gray-700">
                    <span className="font-semibold text-gray-500">{r.snippet.field || "Match"}: </span>
                    <span>{r.snippet.text}</span>
                  </div>
                )}
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
        <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
