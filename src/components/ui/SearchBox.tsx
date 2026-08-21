"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  type: "knowledge" | "ticket";
  id: number;
  title: string;
  summary?: string;
  group_code?: string;
  group_name?: string;
  subtype_code?: string;
  score: number;
}

interface SearchBoxProps {
  initialQuery?: string;
  size?: "sm" | "lg";
  placeholder?: string;
}

export function SearchBox({
  initialQuery = "",
  size = "lg",
  placeholder = "Search errors, TSR, T24 records, keywords...",
}: SearchBoxProps) {
  const [query, setQuery] = useState(initialQuery);
  const [inlineResults, setInlineResults] = useState<SearchResult[]>([]);
  const [showInline, setShowInline] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Close inline results on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowInline(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const doInlineSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setInlineResults([]);
      setShowInline(false);
      return;
    }

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, {
        signal: controller.signal,
      });
      const data = await res.json();
      setInlineResults((data.results || []).slice(0, 8));
      setShowInline(true);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Search error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search as user types
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      doInlineSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, doInlineSearch]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setShowInline(false);
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  const handleResultClick = () => {
    setShowInline(false);
  };

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (inlineResults.length > 0) setShowInline(true); }}
            placeholder={placeholder}
            className={`w-full ${sizeClasses[size]} pl-12 pr-24 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all`}
            autoFocus={size === "lg"}
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-0 px-6 text-white rounded-r-xl transition-colors font-medium text-sm" style={{ backgroundColor: "var(--primary)" }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Inline results dropdown */}
      {showInline && (inlineResults.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-gray-400">Searching...</div>
          )}
          {!loading && inlineResults.length > 0 && (
            <>
              {inlineResults.map((r, idx) => (
                <Link
                  key={`${r.type}-${r.id}-${idx}`}
                  href={r.type === "ticket" ? `/incidents/${r.id}` : `/knowledge/${r.id}`}
                  onClick={handleResultClick}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border mt-0.5 flex-shrink-0 ${
                    r.type === "knowledge"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}>
                    {r.type === "knowledge" ? "KB" : "Inc"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                    {r.summary && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.summary}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {r.group_name && (
                        <span className="text-[10px] text-gray-400">{r.group_name}</span>
                      )}
                      {r.subtype_code && (
                        <span className="text-[10px] text-gray-400">· {r.subtype_code}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              <Link
                href={`/search?q=${encodeURIComponent(query.trim())}`}
                onClick={handleResultClick}
                className="block text-center py-2.5 text-xs font-medium hover:bg-gray-50 transition-colors"
                style={{ color: "var(--primary)" }}
              >
                View all results →
              </Link>
            </>
          )}
        </div>
      )}

      {/* No results message */}
      {showInline && !loading && query.trim().length >= 2 && inlineResults.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 text-center text-sm text-gray-400">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
