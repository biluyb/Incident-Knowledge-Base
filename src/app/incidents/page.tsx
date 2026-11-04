"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    fetch(`/api/incidents?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setTickets(data.tickets || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, group, search, statusFilter, sortField, sortOrder]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    if (typeof dateStr === "string" && dateStr.includes("T")) {
      return dateStr.split("T")[0];
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Temenos Incident Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Register, track, investigate, and resolve core banking incidents reported to Temenos
          </p>
        </div>
        <Link
          href="/incidents/new"
          className="px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <span>+ Register Incident</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by TSR reference, summary, error message, or root cause..."
          className="w-full px-4 py-2.5 pl-10 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600 shadow-sm"
        />
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {search && (
          <button
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status Filter Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: "all", label: "All Incidents" },
            { id: "investigating", label: "Active / Investigating" },
            { id: "waiting_for_temenos", label: "Waiting on Temenos" },
            { id: "resolved", label: "Resolved" },
            { id: "permanently closed", label: "Closed / Historical" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
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

        {/* Group Filter & Sort */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={group}
            onChange={(e) => {
              setGroup(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700"
          >
            <option value="">All Technical Domains</option>
            {groups.map((g) => (
              <option key={g.code} value={g.code}>
                {g.code} — {g.name}
              </option>
            ))}
          </select>
          <select
            value={sortField}
            onChange={(e) => {
              setSortField(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700"
          >
            <option value="created_at_ticket">Date Created</option>
            <option value="reference">Reference</option>
            <option value="priority">Priority</option>
          </select>
          <button
            onClick={() => {
              setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC");
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-700"
          >
            {sortOrder === "DESC" ? "↓ Newest" : "↑ Oldest"}
          </button>
        </div>
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-base font-semibold text-gray-700">No incidents match your filter criteria</p>
          <p className="text-xs text-gray-400 mt-1">Try resetting search keywords or selecting another status tab.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-600">
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">TSR Reference</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Summary / Problem</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Domain</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Internal Owner</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.map((ticket) => {
                  const isClosed =
                    ticket.status?.toLowerCase().includes("closed") ||
                    ticket.status?.toLowerCase().includes("resolved");
                  const isTemenosWaiting =
                    ticket.status?.toLowerCase().includes("temenos") ||
                    ticket.temenos_status?.toLowerCase().includes("waiting");

                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/incidents/${ticket.id}`}
                          className="font-mono font-bold text-green-900 hover:underline"
                        >
                          {ticket.reference}
                        </Link>
                        {ticket.priority && (
                          <div className="mt-0.5">
                            <span className="text-[10px] text-gray-500 font-medium">{ticket.priority}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <div className="flex items-start gap-1.5">
                          {ticket.knowledge_category === "KNOWLEDGE_AVAILABLE" && (
                            <span
                              className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1"
                              title="Comprehensive solution available"
                            />
                          )}
                          <Link
                            href={`/incidents/${ticket.id}`}
                            className="font-medium text-gray-800 hover:text-green-800 line-clamp-1"
                          >
                            {ticket.summary}
                          </Link>
                        </div>
                        {ticket.root_cause_category && (
                          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                            {ticket.root_cause_category}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ticket.group_code ? (
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold text-[10px]">
                            {ticket.group_code}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-gray-700 font-medium">
                          {ticket.assigned_to_name || ticket.internal_owner || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isClosed
                              ? "bg-green-100 text-green-800"
                              : isTemenosWaiting
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {ticket.status || "Open"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {formatDate(ticket.created_at_ticket || ticket.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {tickets.length} of {total} incidents
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
