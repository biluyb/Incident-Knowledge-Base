"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface AuditEntry {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  created_at: string;
}

export default function AuditPage() {
  const { hasPermission } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadEntries();
  }, [page]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?page=${page}&limit=${limit}`);
      const data = await res.json();
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setTotal(data.total || 0);
    } catch (err) {
      setError("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("create")) return "bg-green-100 text-green-700";
    if (action.includes("update") || action.includes("change")) return "bg-blue-100 text-blue-700";
    if (action.includes("delete")) return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  if (!hasPermission("audit.view")) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">You don't have permission to view this page.</p>
        <Link href="/" className="text-sm mt-2 inline-block" style={{ color: "var(--primary)" }}>
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin" className="text-sm text-gray-500 hover:underline mb-1 inline-block">
          ← Admin
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Track system activity and changes.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Audit Entries */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No audit entries found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(entry.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getActionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {entry.entity_type}
                    {entry.entity_id && <span className="text-gray-400 ml-1">#{entry.entity_id}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-md truncate">
                    {entry.details || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {entry.user_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 self-center">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * limit >= total}
            className="btn-secondary text-xs disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
