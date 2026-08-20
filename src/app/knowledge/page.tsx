"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default function KnowledgePage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (groupFilter) params.set("group", groupFilter);
    fetch(`/api/knowledge?${params}`)
      .then((r) => r.json())
      .then((data) => setArticles(data.articles || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Articles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Reusable solutions for T24/Temenos incident types
          </p>
        </div>
        <Link
          href="/knowledge/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          + Add Knowledge
        </Link>
      </div>

      <div className="flex gap-3">
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Groups</option>
          {["A","B","C","D","E","F","G","H","I","J"].map((g) => (
            <option key={g} value={g}>Group {g}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-lg text-gray-600">No knowledge articles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/knowledge/${article.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                {article.subtype_code && (
                  <Badge variant="published">{article.subtype_code}</Badge>
                )}
                <Badge>{article.status}</Badge>
                {article.group_code && (
                  <span className="text-xs text-gray-400">Group {article.group_code}</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">{article.title}</h3>
              {article.symptoms && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{article.symptoms}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
