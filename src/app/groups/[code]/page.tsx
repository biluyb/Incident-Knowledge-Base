"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Subgroup {
  id: number;
  code: string;
  name: string;
  description: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const code = params.code as string;
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubgroup, setSelectedSubgroup] = useState<number | null>(null);
  const [sortField, setSortField] = useState("created_at_ticket");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [page, setPage] = useState(1);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/groups/${code}`)
      .then((r) => r.json())
      .then(setGroup)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!group) return;
    setLoadingTickets(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "15",
      sort: sortField,
      order: sortOrder,
    });
    params.set("group", code);
    if (selectedSubgroup) params.set("subgroup", String(selectedSubgroup));

    fetch(`/api/incidents?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTickets(data.tickets || []);
        setTotalTickets(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoadingTickets(false));
  }, [group, selectedSubgroup, sortField, sortOrder, page, code]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!group || group.error) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-gray-600">Group not found</p>
        <Link href="/groups" className="text-sm mt-2 inline-block hover:underline" style={{ color: "var(--primary)" }}>
          ← Back to Groups
        </Link>
      </div>
    );
  }

  const subgroups: Subgroup[] = group.subtypes || [];
  const ticketCount = totalTickets || group.tickets?.length || 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/groups" className="hover:underline" style={{ color: "var(--primary)" }}>Groups</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{group.name}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        {group.description && (
          <p className="text-sm text-gray-500 mt-1">{group.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
          <span className="font-medium" style={{ color: "var(--primary)" }}>{ticketCount} incidents</span>
          {subgroups.length > 0 && <span>{subgroups.length} subgroups</span>}
          {group.articles?.length > 0 && <span>{group.articles.length} articles</span>}
        </div>
        {group.legacy_code && (
          <p className="text-xs text-gray-400 mt-1">Legacy classification: {group.legacy_code}</p>
        )}
      </div>

      {/* Subgroups */}
      {subgroups.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Subgroups</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={() => { setSelectedSubgroup(null); setPage(1); }}
              className={`text-left p-3 rounded-lg border transition-colors ${
                selectedSubgroup === null
                  ? "border-[var(--primary)] bg-[var(--primary-lighter)]"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-medium text-gray-900">All</p>
              <p className="text-xs text-gray-500 mt-0.5">{ticketCount} incidents</p>
            </button>
            {subgroups.map((sg) => (
              <button
                key={sg.id}
                onClick={() => { setSelectedSubgroup(sg.id); setPage(1); }}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  selectedSubgroup === sg.id
                    ? "border-[var(--primary)] bg-[var(--primary-lighter)]"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
                title={sg.description}
              >
                <p className="text-sm font-medium text-gray-900">{sg.name}</p>
                {sg.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{sg.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search within group + Sort */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/search?group=${code}`}
          className="btn-secondary text-xs"
        >
          Search within this group
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={sortField}
            onChange={(e) => { setSortField(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="created_at_ticket">Date Created</option>
            <option value="reference">Reference</option>
          </select>
          <button
            onClick={() => { setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC"); setPage(1); }}
            className="btn-secondary text-xs"
          >
            {sortOrder === "DESC" ? "↓ Newest" : "↑ Oldest"}
          </button>
        </div>
      </div>

      {/* Knowledge articles */}
      {group.articles && group.articles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Knowledge Base ({group.articles.length})
          </h2>
          <div className="space-y-2">
            {group.articles.map((article: any) => (
              <Link
                key={article.id}
                href={`/knowledge/${article.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                {article.subtype_code && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                    {article.subtype_code}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{article.title}</span>
                  {article.symptoms && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{article.symptoms}</p>
                  )}
                </div>
                <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--primary)" }}>View →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Incident list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Recent Incidents ({totalTickets})
        </h2>

        {loadingTickets ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-11 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500 text-sm">No incidents found{selectedSubgroup ? " for this subgroup" : ""}</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase tracking-wider">Reference</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase tracking-wider">Incident</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase tracking-wider">Subgroup</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket: any) => (
                      <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2">
                          <Link href={`/incidents/${ticket.id}`} className="font-mono text-xs font-medium hover:underline" style={{ color: "var(--primary)" }}>
                            {ticket.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{ticket.summary}</td>
                        <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-[180px]">{ticket.subgroup_name || "—"}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">{ticket.created_at_ticket}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-3">
                <p className="text-sm text-gray-500">
                  Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, totalTickets)} of {totalTickets}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-xs disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary text-xs disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
