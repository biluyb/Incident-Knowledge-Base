"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default function GroupDetailPage() {
  const params = useParams();
  const code = params.code as string;
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/groups/${code}`)
      .then((r) => r.json())
      .then(setGroup)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [code]);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/groups" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← All Groups
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-700 font-bold text-xl rounded-xl">
            {group.code}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-gray-500 mt-1">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
          <span>🎫 {group.tickets?.length || 0} tickets</span>
          <span>📝 {group.articles?.length || 0} articles</span>
          <span>📂 {group.subtypes?.length || 0} sub-types</span>
          <span>🔑 {group.keywords?.length || 0} keywords</span>
        </div>
      </div>

      {/* Sub-types / Knowledge Articles */}
      {group.articles && group.articles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Knowledge Articles</h2>
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

      {/* Tickets */}
      {group.tickets && group.tickets.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Related Tickets ({group.tickets.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Summary</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Severity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tickets.map((ticket: any) => (
                    <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/incidents/${ticket.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                          {ticket.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{ticket.summary}</td>
                      <td className="px-4 py-3">
                        <Badge variant={ticket.priority?.toLowerCase()}>{ticket.priority}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{ticket.severity}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{ticket.status}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{ticket.created_at_ticket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Keywords */}
      {group.keywords && group.keywords.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Keywords</h2>
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
