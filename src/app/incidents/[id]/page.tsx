"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!ticket || ticket.error) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-gray-600">Incident not found</p>
        <Link href="/incidents" className="text-sm mt-2 inline-block hover:underline" style={{ color: "var(--primary)" }}>
          ← Back to Incidents
        </Link>
      </div>
    );
  }

  const metaFields = [
    { label: "Status", value: ticket.status },
    { label: "Requester", value: ticket.requester },
    { label: "Created", value: ticket.created_at_ticket },
    { label: "Resolved", value: ticket.resolved_at },
    { label: "Permanently Closed", value: ticket.permanently_closed_at },
    { label: "Root Cause Category", value: ticket.root_cause_category },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/incidents" className="hover:underline" style={{ color: "var(--primary)" }}>Incidents</Link>
        <span>›</span>
        {ticket.group_code && (
          <>
            <Link href={`/groups/${ticket.group_code}`} className="hover:underline" style={{ color: "var(--primary)" }}>
              {ticket.group_name || ticket.group_code}
            </Link>
            <span>›</span>
          </>
        )}
        <span className="text-gray-900 font-mono text-xs">{ticket.reference}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{ticket.reference}</h1>
          <p className="text-gray-600 mt-1">{ticket.summary}</p>
        </div>
        <Link href={`/incidents/${ticket.id}/edit`} className="btn-secondary text-xs flex-shrink-0">
          Edit
        </Link>
      </div>

      {/* Classification badges */}
      <div className="flex flex-wrap gap-2">
        {ticket.group_code && (
          <Link
            href={`/groups/${ticket.group_code}`}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 transition-colors"
          >
            {ticket.group_name || ticket.group_code}
          </Link>
        )}
        {ticket.subgroup_name && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            {ticket.subgroup_name}
          </span>
        )}
        {ticket.classification_confidence && (
          <span className="text-xs text-gray-400 self-center ml-1">
            Confidence: {ticket.classification_confidence}
          </span>
        )}
        {ticket.legacy_group && (
          <span className="text-xs text-gray-400 self-center">
            Legacy: {ticket.legacy_group}
          </span>
        )}
      </div>

      {/* Historical Metadata */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Historical Incident Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metaFields.filter(f => f.value).map((f) => (
            <div key={f.label}>
              <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
              <p className="text-sm text-gray-800">{String(f.value)}</p>
            </div>
          ))}
        </div>
        {ticket.group_code && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Classification</p>
            <Link
              href={`/groups/${ticket.group_code}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
              style={{ color: "var(--primary)" }}
            >
              {ticket.group_name || ticket.group_code}
              {ticket.subgroup_name && (
                <span className="text-gray-400 font-normal">→ {ticket.subgroup_name}</span>
              )}
            </Link>
          </div>
        )}
        {ticket.custom_fields && Object.keys(ticket.custom_fields).length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Additional Details</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(ticket.custom_fields).map(([key, value]) => (
                value ? (
                  <div key={key}>
                    <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm text-gray-800">{String(value)}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Knowledge */}
      {ticket.related_articles && ticket.related_articles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Related Knowledge
          </h2>
          <div className="space-y-2">
            {ticket.related_articles.map((article: any) => (
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
                <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--primary)" }}>View Solution →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Similar Incidents */}
      {ticket.similar_incidents && ticket.similar_incidents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Similar Historical Incidents
          </h2>
          <div className="space-y-2">
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
                      {sim.group_code && (
                        <span className="text-xs text-gray-500">{sim.group_name || sim.group_code}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{sim.summary}</p>
                  </div>
                  {pct > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-green-50 text-green-700">
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
