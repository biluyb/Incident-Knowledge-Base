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

  // Check if incident has its own Problem & Solution content
  const hasOwnKnowledge = ticket.problem_symptoms || ticket.root_cause ||
    ticket.diagnostic_information || ticket.immediate_fix ||
    ticket.permanent_fix || ticket.prevention || ticket.verification;

  // Knowledge articles by priority (supplementary context)
  const directlyLinked = ticket.directly_linked_articles || [];
  const subgroupArticles = ticket.subgroup_articles || [];
  const groupArticles = ticket.group_articles || [];
  const similarIncidents = ticket.similar_incidents || [];
  const subgroupIncidents = ticket.subgroup_incidents || [];

  // Check if there's any linked knowledge to show
  const hasAnyLinkedKnowledge = directlyLinked.length > 0 || subgroupArticles.length > 0 || groupArticles.length > 0;

  return (
    <div className="max-w-4xl space-y-6">
      {/* ============================================================
          HEADER — Incident identity and classification
          ============================================================ */}
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

      {/* Incident title and classification */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{ticket.reference}</h1>
          {hasSummary && <p className="text-gray-600 mt-1">{ticket.summary}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
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
            {ticket.legacy_group && (
              <span className="text-xs text-gray-400 self-center ml-1">Legacy: {ticket.legacy_group}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <Link href={`/incidents/${ticket.id}/edit`} className="btn-secondary text-xs">
            Edit Incident
          </Link>
          {ticket.group_code && (
            <Link
              href={`/knowledge/new?from_incident=${ticket.id}`}
              className="btn-primary text-xs"
              title="Create a knowledge article pre-filled from this incident's Problem & Solution fields"
            >
              → Create KB Article
            </Link>
          )}
        </div>
      </div>

      {/* ============================================================
          SECTION 1: PROBLEM & SOLUTION (Primary content)
          The incident's own knowledge structure
          ============================================================ */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Problem & Solution
        </h2>
        <div className="space-y-5">
          {/* Problem / Symptoms */}
          <div>
            <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Problem / Symptoms</h3>
            {ticket.problem_symptoms ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.problem_symptoms}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Not provided</p>
            )}
          </div>

          {/* Root Cause */}
          <div>
            <h3 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Root Cause</h3>
            {ticket.root_cause ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.root_cause}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Not provided</p>
            )}
          </div>

          {/* Diagnostic Information */}
          <div>
            <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Diagnostic Information</h3>
            {ticket.diagnostic_information ? (
              <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                {ticket.diagnostic_information}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Not provided</p>
            )}
          </div>

          {/* Immediate Fix */}
          <div>
            <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Immediate Fix</h3>
            {ticket.immediate_fix ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{ticket.immediate_fix}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Not provided</p>
            )}
          </div>

          {/* Permanent Fix */}
          <div>
            <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Permanent Fix</h3>
            {ticket.permanent_fix ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{ticket.permanent_fix}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Not provided</p>
            )}
          </div>

          {/* Prevention */}
          <div>
            <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Prevention</h3>
            {ticket.prevention ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.prevention}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Not provided</p>
            )}
          </div>

          {/* Verification */}
          <div>
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Verification</h3>
            {ticket.verification ? (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                {ticket.verification.split("\n").filter(Boolean).map((line: string, i: number) => (
                  <label key={i} className="flex items-start gap-2 text-sm text-gray-800 py-0.5">
                    <input type="checkbox" className="mt-1 rounded border-gray-300" />
                    <span>{line.replace(/^[✓☐☐\-\*\d\.]+\s*/, "")}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Not provided</p>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 2: ADDITIONAL INFORMATION
          ============================================================ */}
      {(ticket.temenos_contact || ticket.notes) && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Additional Information
          </h2>
          <div className="space-y-4">
            {ticket.temenos_contact && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Temenos Contact</h3>
                <p className="text-sm text-gray-700">{ticket.temenos_contact}</p>
              </div>
            )}
            {ticket.notes && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 3: LINKED KNOWLEDGE ARTICLES (Supplementary)
          Directly linked articles and subgroup/group knowledge
          ============================================================ */}
      {hasAnyLinkedKnowledge && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Related Knowledge Base
            </h2>
          </div>

          {/* Directly linked articles */}
          {directlyLinked.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Directly linked ({directlyLinked.length})</p>
              {directlyLinked.map((article: any) => (
                <KnowledgeArticleCard key={article.id} article={article} compact />
              ))}
            </div>
          )}

          {/* Subgroup articles */}
          {!hasOwnKnowledge && subgroupArticles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Subgroup: {ticket.subgroup_name}</p>
              {subgroupArticles.map((article: any) => (
                <KnowledgeArticleCard key={article.id} article={article} compact />
              ))}
            </div>
          )}

          {/* Group articles */}
          {!hasOwnKnowledge && subgroupArticles.length === 0 && groupArticles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Group: {ticket.group_name}</p>
              {groupArticles.map((article: any) => (
                <KnowledgeArticleCard key={article.id} article={article} compact />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          SECTION 4: INCIDENT METADATA (Secondary)
          Historical information, status, dates
          ============================================================ */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Incident Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {ticket.status && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.status}</p>
            </div>
          )}
          {ticket.requester && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Requester</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.requester}</p>
            </div>
          )}
          {ticket.created_at_ticket && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Created</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.created_at_ticket}</p>
            </div>
          )}
          {ticket.resolved_at && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Resolved</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.resolved_at}</p>
            </div>
          )}
          {ticket.permanently_closed_at && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Permanently Closed</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.permanently_closed_at}</p>
            </div>
          )}
          {ticket.root_cause_category && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Root Cause Category</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.root_cause_category}</p>
            </div>
          )}
          {ticket.priority && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Priority</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.priority}</p>
            </div>
          )}
          {ticket.severity && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Severity</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.severity}</p>
            </div>
          )}
          {ticket.classification_confidence && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Classification</p>
              <p className="text-sm text-gray-800 font-medium">{ticket.classification_confidence}</p>
            </div>
          )}
        </div>
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

      {/* ============================================================
          SECTION 5: RELATED INCIDENTS (Secondary)
          ============================================================ */}
      {similarIncidents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Related Incidents
          </h2>
          <div className="space-y-2">
            {similarIncidents.map((sim: any) => {
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
      {subgroupIncidents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Other Incidents in This Subgroup
          </h2>
          <div className="space-y-2">
            {subgroupIncidents.map((si: any) => (
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

      {/* ============================================================
          SECTION 6: ATTACHMENTS
          ============================================================ */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Attachments
        </h2>
        <FileUpload ticketId={ticket.id} files={files} onFilesChanged={loadFiles} />
      </div>
    </div>
  );
}

// ============================================================
// Knowledge Article Card Component
// Shows full solution content or compact list item
// ============================================================
function KnowledgeArticleCard({ article, compact = false }: { article: any; compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href={`/knowledge/${article.id}`}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 bg-white"
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
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Article header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {article.subtype_code && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              {article.subtype_code}
            </span>
          )}
          {article.group_code && (
            <Link href={`/groups/${article.group_code}`} className="text-xs text-gray-500 hover:underline">
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
        {article.symptoms && (
          <div>
            <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Problem / Symptoms</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{article.symptoms}</p>
          </div>
        )}

        {article.root_cause && (
          <div>
            <h3 className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Root Cause</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{article.root_cause}</p>
          </div>
        )}

        {article.diagnostic_data && (
          <div>
            <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Diagnostic Commands</h3>
            <div className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
              {article.diagnostic_data}
            </div>
          </div>
        )}

        {article.immediate_fix && (
          <div>
            <h3 className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Immediate Fix</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{article.immediate_fix}</p>
            </div>
          </div>
        )}

        {article.permanent_fix && (
          <div>
            <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Permanent Fix</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{article.permanent_fix}</p>
            </div>
          </div>
        )}

        {article.prevention && (
          <div>
            <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Prevention</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{article.prevention}</p>
          </div>
        )}

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
  );
}
