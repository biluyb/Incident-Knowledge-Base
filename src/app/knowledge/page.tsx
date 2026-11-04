"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/components/AuthProvider";

export default function KnowledgePage() {
  const { hasPermission } = useAuth();
  const [articles, setArticles] = useState<any[]>([]);
  const [groups, setGroups] = useState<{ code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("approved");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (groupFilter) params.set("group", groupFilter);
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/knowledge?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setArticles(data.articles || []);
        if (typeof data.pendingCount === "number") {
          setPendingCount(data.pendingCount);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupFilter, statusFilter]);

  const canApprove = hasPermission("knowledge.approve");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Standard operating procedures, incident resolutions, and technical documentation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && (
            <Link
              href="/knowledge/review"
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <span>Review Queue</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
          <Link
            href="/knowledge/new"
            className="px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-sm transition-colors"
            style={{ backgroundColor: "var(--primary)" }}
          >
            + Create Article
          </Link>
        </div>
      </div>

      {/* Filter and Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: "approved", label: "Approved & Published" },
            { id: "pending", label: `Pending Review ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
            { id: "draft", label: "Drafts" },
            { id: "all", label: "All Records" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? "bg-gray-900 text-white font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-2">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700"
          >
            <option value="">All Technical Domains</option>
            {groups.map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} — {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-base font-semibold text-gray-700">No knowledge articles match this filter</p>
          <p className="text-xs text-gray-400 mt-1">Try selecting another status tab or technical domain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => {
            const isApproved = article.status === "approved" || article.status === "published";
            const isPending = article.status === "submitted" || article.status === "under_review";
            const isDraft = article.status === "draft";

            return (
              <Link
                key={article.id}
                href={`/knowledge/${article.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {article.subtype_code && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                        {article.subtype_code}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isApproved
                          ? "bg-green-100 text-green-800"
                          : isPending
                          ? "bg-amber-100 text-amber-800"
                          : isDraft
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {article.status}
                    </span>
                    {article.group_code && (
                      <span className="text-xs text-gray-400">
                        {article.group_name || article.group_code}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm hover:text-green-800 transition-colors">
                    {article.title}
                  </h3>
                  {article.symptoms && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                      {article.symptoms}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span>ID: KB-{article.id}</span>
                  <span>View Details →</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
