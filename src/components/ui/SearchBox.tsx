"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
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
          placeholder={placeholder}
          className={`w-full ${sizeClasses[size]} pl-12 pr-4 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all`}
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
  );
}
