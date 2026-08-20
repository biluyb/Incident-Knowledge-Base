"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/tickets/${id}`)
      .then((r) => r.json())
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!ticket || ticket.error) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">🎫</div>
        <p className="text-lg text-gray-600">Ticket not found</p>
        <Link href="/tickets" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Tickets
        </Link>
      </div>
    );
  }

  const fields = [
    { label: "Status", value: ticket.status },
    { label: "Priority", value: ticket.priority, badge: true },
    { label: "Severity", value: ticket.severity, badge: true },
    { label: "Requester", value: ticket.requester },
    { label: "Created", value: ticket.created_at_ticket },
    { label: "Resolved", value: ticket.resolved_at },
    { label: "Permanently Closed", value: ticket.permanently_closed_at },
    { label: "Root Cause", value: ticket.root_cause_category },
  ];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href="/tickets" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← All Tickets
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 font-mono">{ticket.reference}</h1>
        <p className="text-gray-600 mt-2">{ticket.summary}</p>
      </div>

      {/* Ticket Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Incident Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fields.filter(f => f.value).map((f) => (
            <div key={f.label}>
              <p className="text-xs text-gray-400 mb-1">{f.label}</p>
              {f.badge ? (
                <Badge variant={String(f.value).toLowerCase()}>{String(f.value)}</Badge>
              ) : (
                <p className="text-sm text-gray-800">{String(f.value)}</p>
              )}
            </div>
          ))}
        </div>
        {ticket.group_code && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Assigned Group</p>
            <Link
              href={`/groups/${ticket.group_code}`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <span className="font-bold">Group {ticket.group_code}</span>
              {ticket.group_name && <span className="text-gray-500">— {ticket.group_name}</span>}
            </Link>
          </div>
        )}
      </div>

      {/* Related Knowledge */}
      {ticket.related_articles && ticket.related_articles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Related Knowledge</h2>
          <div className="space-y-3">
            {ticket.related_articles.map((article: any) => (
              <Link
                key={article.id}
                href={`/knowledge/${article.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {article.subtype_code && (
                  <Badge variant="published">{article.subtype_code}</Badge>
                )}
                <span className="text-sm font-medium text-gray-900">{article.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
