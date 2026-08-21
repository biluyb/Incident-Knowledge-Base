"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FileUpload } from "@/components/ui/FileUpload";

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/incidents/${id}`).then((r) => r.json()),
      fetch(`/api/files?ticket_id=${id}`).then((r) => r.json()),
    ])
      .then(([ticketData, filesData]) => {
        if (ticketData.error) throw new Error(ticketData.error);
        setTicket(ticketData);
        setFiles(Array.isArray(filesData) ? filesData : []);
      })
      .catch(() => setError("Unable to load incident. It may not exist or there was a connection error."))
      .finally(() => setLoading(false));
  }, [id]);

  const loadFiles = useCallback(() => {
    fetch(`/api/files?ticket_id=${id}`).then((r) => r.json()).then((data) => {
      setFiles(Array.isArray(data) ? data : []);
    }).catch(console.error);
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

  if (error || !ticket || ticket.error) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-gray-700 font-medium">Incident not found</p>
        <p className="text-sm text-gray-500 mt-1">{error || "The requested incident could not be found."}</p>
        <Link href="/incidents" className="text-sm mt-3 inline-block hover:underline" style={{ color: "var(--primary)" }}>
          ← Back to Incidents
        </Link>
      </div>
    );
  }

  const hasSummary = ticket.summary && ticket.summary.trim().length > 0;

  const metaFields = [
    { label: "Status", value: ticket.status },
    { label: "Requester", value: ticket.requester },
    { label: "Created", value: ticket.created_at_ticket },
    { label: "Resolved", value: ticket.resolved_at },
    { label: "Permanently Closed", value: ticket.permanently_closed_at },
    { label: "Root Cause Category", value: ticket.root_cause_category },
  ];

  const directlyLinked = ticket.directly_linked_articles || [];
  const groupArticles = ticket.group_articles || [];

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
          {hasSummary && <p className="text-gray-600 mt-1">{ticket.summary}</p>}
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

      {/* ================================================================
          DIRECTLY LINKED KNOWLEDGE BASE FIXES — the main KB content
          These are articles linked to this specific ticket via ticket_articles
          Shows root cause, diagnostic data, immediate fix, permanent fix
          ================================================================ */}
      <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Knowledge Base Fixes
              {directlyLinked.length > 0 && ` (${directlyLinked.length})`}
            </h2>
          </div>

          {directlyLinked.length === 0 && (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 text-center">
              <div className="text-2xl mb-2">📋</div>
              <p className="text-sm text-gray-500 font-medium">No related knowledge base information found</p>
              <p className="text-xs text-gray-400 mt-1">This incident does not have any linked knowledge base fixes yet.</p>
              {ticket.group_code && (
                <Link
                  href={`/groups/${ticket.group_code}`}
                  className="inline-block mt-3 text-xs font-medium hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  Browse {ticket.group_name || ticket.group_code} Knowledge Base →
                </Link>
              )}
            </div>
          )}
          {directlyLinked.map((article: any) => (
            <div key={article.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Article header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {article.subtype_code && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {article.subtype_code}
                    </span>
                  )}
                  {article.group_code && (
                    <Link
                      href={`/groups/${article.group_code}`}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      {article.group_name || article.group_code}
                    </Link>
                  )}
                </div>
                <Link
                  href={`/knowledge/${article.id}`}
                  className="text-base font-semibold text-gray-900 hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  {article.title}
                </Link>
              </div>

              {/* Article content sections */}
              <div className="px-5 py-4 space-y-4">
                {/* Symptoms */}
                {article.symptoms && (
                  <div>
                    <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Problem / Symptoms</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{article.symptoms}</p>
                  </div>
                )}

                {/* Root Cause */}
                {article.root_cause && (
                  <div>
                    <h3 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Root Cause</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{article.root_cause}</p>
                  </div>
                )}

                {/* Diagnostic Data */}
                {article.diagnostic_data && (
                  <div>
                    <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Diagnostic Commands</h3>
                    <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                      {article.diagnostic_data}
                    </div>
                  </div>
                )}

                {/* Immediate Fix */}
                {article.immediate_fix && (
                  <div>
                    <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Immediate Fix</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{article.immediate_fix}</p>
                    </div>
                  </div>
                )}

                {/* Permanent Fix */}
                {article.permanent_fix && (
                  <div>
                    <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Permanent Fix</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{article.permanent_fix}</p>
                    </div>
                  </div>
                )}

                {/* Prevention */}
                {article.prevention && (
                  <div>
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Prevention</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{article.prevention}</p>
                  </div>
                )}

                {/* Verification */}
                {article.verification && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Verification</h3>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      {article.verification.split("\n").filter(Boolean).map((line: string, i: number) => (
                        <label key={i} className="flex items-start gap-2 text-sm text-gray-800 py-0.5">
                          <input type="checkbox" className="mt-1 rounded border-gray-300" />
                          <span>{line.replace(/^[✓☐☐\-\*\d\.]+\s*/, "")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link to full article */}
                <div className="pt-2 border-t border-gray-100">
                  <Link
                    href={`/knowledge/${article.id}`}
                    className="text-xs font-medium hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    View full article →
                  </Link>
                </div>
              </div>
            </div>
          ))}
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
              <p className="text-sm text-gray-800 font-medium">{String(f.value)}</p>
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

      {/* Group Knowledge Base Articles (broader context) */}
      {groupArticles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Related Group Knowledge Base
          </h2>
          <p className="text-xs text-gray-400 mb-3">Other articles in {ticket.group_name || "this group"}</p>
          <div className="space-y-2">
            {groupArticles.map((article: any) => (
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

      {/* Subgroup-related incidents */}
      {ticket.subgroup_incidents && ticket.subgroup_incidents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Other Incidents in This Subgroup
          </h2>
          <div className="space-y-2">
            {ticket.subgroup_incidents.map((si: any) => (
              <Link
                key={si.id}
                href={`/incidents/${si.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <span className="text-sm font-mono font-medium text-gray-900">{si.reference}</span>
                <span className="text-sm text-gray-600 truncate flex-1">{si.summary}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* File Uploads */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Attached Files
        </h2>
        <FileUpload ticketId={ticket.id} files={files} onFilesChanged={loadFiles} />
      </div>
    </div>
  );
}
