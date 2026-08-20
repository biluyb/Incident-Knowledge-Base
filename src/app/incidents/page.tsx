"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Group {
  code: string;
  name: string;
}

export default function IncidentsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [group, setGroup] = useState("");
  const [sortField, setSortField] = useState("created_at_ticket");
  const [sortOrder, setSortOrder] = useState("DESC");

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "15",
      sort: sortField,
      order: sortOrder,
    });
    if (group) params.set("group", group);

    fetch(`/api/incidents?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTickets(data.tickets || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, group, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
          <p className="text-sm text-gray-500 mt-1">Search and browse historical technical incidents.</p>
        </div>
        <Link href="/incidents/new" className="btn-primary">
          + Add Incident
        </Link>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={group}
          onChange={(e) => { setGroup(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
        >
          <option value="">All Groups</option>
          {groups.map((g) => (
            <option key={g.code} value={g.code}>{g.name}</option>
          ))}
        </select>
        <select
          value={sortField}
          onChange={(e) => { setSortField(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
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

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="h-11 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 font-medium">No incidents found</p>
          <p className="text-sm text-gray-400 mt-1">Try different search terms or remove filters.</p>
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
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase tracking-wider">Group</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase tracking-wider">Subgroup</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2">
                        <Link href={`/incidents/${ticket.id}`} className="font-mono text-xs font-medium hover:underline" style={{ color: "var(--primary)" }}>
                          {ticket.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{ticket.summary}</td>
                      <td className="px-4 py-2">
                        {ticket.group_code && (
                          <Link href={`/groups/${ticket.group_code}`} className="text-xs font-medium hover:underline" style={{ color: "var(--primary)" }}>
                            {ticket.group_name || ticket.group_code}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-[180px]">{ticket.subgroup_name || "—"}</td>
                      <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">{ticket.created_at_ticket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-secondary text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
