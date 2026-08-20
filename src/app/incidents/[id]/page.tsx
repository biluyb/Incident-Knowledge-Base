"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/incidents/${id}`)
      .then((r) => r.json())
      .then(setTicket)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!ticket || ticket.error) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-lg text-gray-600">Incident not found</p>
        <Link href="/incidents" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Incidents
        </Link>
      </div>
    );
  }

  const metaFields = [
    { label: "Status", value: ticket.status },
    { label: "Priority", value: ticket.priority },
    { label: "Severity", value: ticket.severity },
    { label: "Requester", value: ticket.requester },
    { label: "Created", value: ticket.created_at_ticket },
    { label: "Resolved", value: ticket.resolved_at },
    { label: "Permanently Closed", value: ticket.permanently_closed_at },
    { label: "Root Cause Category", value: ticket.root_cause_category },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/incidents" className="text-blue-600 hover:underline">← All Incidents</Link>
          {ticket.group_code && (
            <>
              <span>·</span>
              <Link href={`/groups/${ticket.group_code}`} className="text-blue-600 hover:underline">
                {ticket.group_name || ticket.group_code}
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{ticket.reference}</h1>
          <Link
            href={`/incidents/${ticket.id}/edit`}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ✏️ Edit
          </Link>
        </div>
        <p className="text-gray-600 mt-2">{ticket.summary}</p>
      </div>

      {/* Classification Info */}
      <div className="flex flex-wrap gap-3 text-sm">
        {ticket.group_code && (
          <Link href={`/groups/${ticket.group_code}`} className="inline-flex items-center gap-1.5">
            <Badge>Group: {ticket.group_name || ticket.group_code}</Badge>
          </Link>
        )}
        {ticket.subgroup_name && (
          <Badge variant="published">{ticket.subgroup_name}</Badge>
        )}
        {ticket.classification_confidence && (
          <span className="text-xs text-gray-400 self-center">
            Confidence: {ticket.classification_confidence}
          </span>
        )}
        {ticket.legacy_group && (
          <span className="text-xs text-gray-400 self-center">
            Legacy: {ticket.legacy_group}
          </span>
        )}
      </div>

      {/* Historical Metadata — §15 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Historical Incident Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metaFields.filter(f => f.value).map((f) => (
            <div key={f.label}>
              <p className="text-xs text-gray-400 mb-1">{f.label}</p>
              {["Priority", "Severity"].includes(f.label) ? (
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
              <span className="font-bold">{ticket.group_name || ticket.group_code}</span>
              {ticket.subgroup_name && (
                <span className="text-gray-500">→ {ticket.subgroup_name}</span>
              )}
            </Link>
          </div>
        )}
        {ticket.custom_fields && Object.keys(ticket.custom_fields).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Custom Fields</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(ticket.custom_fields).map(([key, value]) => (
                value ? (
                  <div key={key}>
                    <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-800">{String(value)}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Knowledge Articles — §24 */}
      {ticket.related_articles && ticket.related_articles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Related Knowledge
          </h2>
          <div className="space-y-3">
            {ticket.related_articles.map((article: any) => (
              <Link
                key={article.id}
                href={`/knowledge/${article.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                {article.subtype_code && (
                  <Badge variant="published">{article.subtype_code}</Badge>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{article.title}</span>
                  {article.symptoms && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{article.symptoms}</p>
                  )}
                </div>
                <span className="text-xs text-blue-600">View Solution →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Similar Historical Incidents — §23 */}
      {ticket.similar_incidents && ticket.similar_incidents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Similar Historical Incidents
          </h2>
          <div className="space-y-3">
            {ticket.similar_incidents.map((sim: any) => {
              const pct = Math.round((sim.similarity_score || 0) * 100);
              return (
                <Link
                  key={sim.id}
                  href={`/incidents/${sim.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium text-gray-900">{sim.reference}</span>
                      {sim.group_code && <Badge>Group {sim.group_code}</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{sim.summary}</p>
                  </div>
                  {pct > 0 && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full whitespace-nowrap">
                      {pct}% similar
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
