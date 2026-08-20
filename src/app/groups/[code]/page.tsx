"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface Subgroup {
  id: number;
  code: string;
  name: string;
  description: string;
  ticket_count?: number;
}

interface Ticket {
  id: number;
  reference: string;
  summary: string;
  priority: string;
  severity: string;
  status: string;
  created_at_ticket: string;
  subgroup_id: number | null;
  subgroup_name?: string;
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

  // Fetch tickets with filtering, sorting, pagination
  useEffect(() => {
    if (!group) return;
    setLoadingTickets(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!group || group.error) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📁</div>
        <p className="text-lg text-gray-600">Group not found</p>
        <Link href="/groups" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Groups
        </Link>
      </div>
    );
  }

  const subgroups: Subgroup[] = group.subtypes || [];
  const ticketCount = group.tickets?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/groups" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← All Groups
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        {group.description && (
          <p className="text-sm text-gray-500 mt-1">{group.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
          <span>📋 {ticketCount} incidents</span>
          {subgroups.length > 0 && <span>📂 {subgroups.length} subgroups</span>}
          {group.articles?.length > 0 && <span>📝 {group.articles.length} articles</span>}
          {group.keywords?.length > 0 && <span>🔑 {group.keywords.length} keywords</span>}
        </div>
        {group.legacy_code && (
          <p className="text-xs text-gray-400 mt-1">Legacy classification: {group.legacy_code}</p>
        )}
      </div>

      {/* Subgroups — §15 design */}
      {subgroups.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Subgroups</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedSubgroup(null); setPage(1); }}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                selectedSubgroup === null
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
              }`}
            >
              All ({ticketCount})
            </button>
            {subgroups.map((sg) => (
              <button
                key={sg.id}
                onClick={() => { setSelectedSubgroup(sg.id); setPage(1); }}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  selectedSubgroup === sg.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-300"
                }`}
                title={sg.description}
              >
                {sg.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search within group */}
      <div className="flex items-center gap-3">
        <Link
          href={`/search?q=&group=${code}`}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          🔎 Search within {group.name}
        </Link>
      </div>

      {/* Sorting controls */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">Sort:</span>
        <select
          value={sortField}
          onChange={(e) => { setSortField(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="created_at_ticket">Date Created</option>
          <option value="reference">Reference</option>
          <option value="priority">Priority</option>
          <option value="severity">Severity</option>
        </select>
        <button
          onClick={() => { setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC"); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {sortOrder === "DESC" ? "↓ Newest" : "↑ Oldest"}
        </button>
      </div>

      {/* Incident list — §15 design */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Historical Incidents ({totalTickets})
        </h2>

        {loadingTickets ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">No incidents found{selectedSubgroup ? " for this subgroup" : ""}</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Summary</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Subgroup</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket: any) => (
                      <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/incidents/${ticket.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                            {ticket.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{ticket.summary}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{ticket.subgroup_name || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={ticket.priority?.toLowerCase()}>{ticket.priority}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge>{ticket.severity}</Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{ticket.created_at_ticket}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Knowledge Articles */}
      {group.articles && group.articles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Knowledge Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.articles.map((article: any) => (
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
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{article.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {group.keywords && group.keywords.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Search Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {group.keywords.map((kw: any) => (
              <Link
                key={kw.id}
                href={`/search?q=${encodeURIComponent(kw.keyword)}`}
                className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
              >
                {kw.keyword}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
