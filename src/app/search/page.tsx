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

  const truncate = (text: string, maxLen: number) => {
    if (!text || text.length <= maxLen) return text;
    return text.slice(0, maxLen).trimEnd() + "…";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-1/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : q && results.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No matching knowledge found</p>
          <p className="text-sm text-gray-400 mt-1.5">Try different keywords, error messages, or TSR references</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-gray-500">{total} result{total !== 1 ? "s" : ""} found</p>
          <div className="space-y-2">
            {results.map((r, idx) => {
              const hasSolution = r.has_solution;
              const solutionPreview = r.solution_preview;
              const problemText = r.problem_symptoms || "";
              const isTicket = r.type === "ticket";
              const linkHref = isTicket ? `/incidents/${r.id}` : `/knowledge/${r.id}`;

              return (
                <Link
                  key={`${r.type}-${r.id}-${idx}`}
                  href={linkHref}
                  className={`group block bg-white rounded-lg border transition-all hover:shadow-md ${
                    hasSolution
                      ? "border-l-[3px] border-l-[#fec80c] border-t-gray-200 border-r-gray-200 border-b-gray-200"
                      : "border-gray-200"
                  }`}
                >
                  <div className="p-5">
                    {/* Top: group + reference */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      {r.group_name && <span className="font-medium text-gray-500">{r.group_name}</span>}
                      {r.subtype_code && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>{r.subtype_code}</span>
                        </>
                      )}
                      {isTicket && r.title && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className="font-mono font-semibold text-gray-600">{r.title}</span>
                        </>
                      )}
                    </div>

                    {/* Title / summary */}
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#215b30] transition-colors mb-1.5">
                      {truncate(r.summary || "", 120)}
                    </h3>

                    {/* Problem preview */}
                    {problemText && (
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {truncate(problemText, 200)}
                      </p>
                    )}

                    {/* Solution indicator — only for incidents with meaningful solution */}
                    {hasSolution && solutionPreview && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#215b30]">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Solution available
                        </span>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1 leading-relaxed">
                          {truncate(solutionPreview, 150)}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
