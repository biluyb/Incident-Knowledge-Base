"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { CommentsSection } from "@/components/ui/CommentsSection";
import { useAuth } from "@/components/AuthProvider";

function Section({ title, content, copyable = false }: { title: string; content: string | null; copyable?: boolean }) {
  if (!content) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        {copyable && <CopyButton text={content} />}
      </div>
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100">
        {content}
      </div>
    </div>
  );
}

export default function KnowledgeArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { hasPermission } = useAuth();

  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewModal, setReviewModal] = useState<"approve" | "reject" | null>(null);

  const fetchArticle = () => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/knowledge/${id}`)
      .then((r) => r.json())
      .then(setArticle)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const handleSubmitForReview = async () => {
    if (!confirm("Are you ready to submit this article for Team Lead / Knowledge Manager review?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/knowledge/${id}/submit`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("Article submitted for review!");
        fetchArticle();
      } else {
        alert(data.error || "Failed to submit article");
      }
    } catch {
      alert("Network error submitting article");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAction = async () => {
    if (!reviewModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/knowledge/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reviewModal, notes: reviewNote }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Article ${reviewModal === "approve" ? "approved" : "rejected"} successfully!`);
        setReviewModal(null);
        setReviewNote("");
        fetchArticle();
      } else {
        alert(data.error || "Failed to process review");
      }
    } catch {
      alert("Network error processing review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!article || article.error) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4">📝</div>
        <p className="text-lg font-semibold text-gray-700">Article not found</p>
        <Link href="/knowledge" className="text-green-800 hover:underline mt-2 inline-block text-sm">
          ← Back to Knowledge Articles
        </Link>
      </div>
    );
  }

  const isApproved = article.status === "approved" || article.status === "published";
  const isPending = article.status === "submitted" || article.status === "under_review";
  const isDraft = article.status === "draft";
  const isRejected = article.status === "rejected";
  const canApprove = hasPermission("knowledge.approve");

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back link */}
      <div>
        <Link href="/knowledge" className="text-xs text-gray-500 hover:underline inline-block mb-2">
          ← Knowledge Articles
        </Link>
      </div>

      {/* Review Banner if Pending Review */}
      {isPending && canApprove && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Review Required</span>
            <p className="text-sm text-amber-800 mt-0.5">
              This article was submitted for review. As a reviewer, you can approve or return it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setReviewModal("reject"); setReviewNote(""); }}
              className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
            >
              Reject / Return
            </button>
            <button
              onClick={() => { setReviewModal("approve"); setReviewNote(""); }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-green-700 rounded-lg hover:bg-green-800"
            >
              Approve & Publish
            </button>
          </div>
        </div>
      )}

      {/* Draft / Rejected Banner */}
      {(isDraft || isRejected) && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              {isDraft ? "Draft Article" : "Article Returned for Revision"}
            </span>
            <p className="text-sm text-gray-600 mt-0.5">
              {isDraft
                ? "This article is private to you and reviewers until submitted and approved."
                : "This article was returned. Please review feedback, edit content, and resubmit."}
            </p>
          </div>
          <button
            onClick={handleSubmitForReview}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {submitting ? "Submitting..." : "Submit for Review →"}
          </button>
        </div>
      )}

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              isApproved
                ? "bg-green-100 text-green-800"
                : isPending
                ? "bg-amber-100 text-amber-800"
                : isDraft
                ? "bg-gray-100 text-gray-700"
                : "bg-red-100 text-red-800"
            }`}
          >
            {article.status}
          </span>
          {article.group_code && (
            <Link href={`/groups/${article.group_code}`}>
              <Badge>Group {article.group_code}</Badge>
            </Link>
          )}
          {article.subtype_code && <Badge variant="published">{article.subtype_code}</Badge>}
          <span className="text-xs text-gray-400 ml-auto">KB-{article.id}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
            {article.group_name && (
              <p className="text-sm text-gray-500 mt-1 font-medium">{article.group_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/knowledge/${id}/edit`}
              className="px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              Edit Article
            </Link>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Problem, Diagnosis, Fix, Verification, Comments */}
        <div className="lg:col-span-2 space-y-6">
          <Section title="Problem / Symptoms" content={article.symptoms} />
          <Section title="Root Cause Analysis" content={article.root_cause} />
          <Section title="Diagnostic Information & Commands" content={article.diagnostic_data} copyable />
          <Section title="Immediate Workaround / Quick Fix" content={article.immediate_fix} copyable />
          <Section title="Permanent Solution" content={article.permanent_fix} copyable />
          <Section title="Prevention & Safeguards" content={article.prevention} />

          {/* Verification checklist */}
          {article.verification && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Verification Steps</h3>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                {article.verification.split("\n").filter(Boolean).map((line: string, i: number) => (
                  <label key={i} className="flex items-start gap-2.5 text-sm text-gray-800 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-green-700 focus:ring-green-600" />
                    <span>{line.replace(/^[✓☐☐\-\*\d\.]+\s*/, "")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Version History section if versions exist */}
          {article.versions && article.versions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Revision History ({article.versions.length})</h3>
              <div className="space-y-2">
                {article.versions.map((ver: any) => (
                  <div
                    key={ver.id}
                    className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-gray-800">Version {ver.version_number}:</span>{" "}
                      <span className="text-gray-600">{ver.change_summary || "Revision snapshot"}</span>
                    </div>
                    <span className="text-gray-400">
                      {new Date(ver.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments and Peer Discussion */}
          <CommentsSection entityType="knowledge" entityId={article.id} />
        </div>

        {/* Right Column: Historical Incidents, Contacts, References */}
        <div className="space-y-6">
          {/* Historical Incidents */}
          {article.related_tickets && article.related_tickets.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Historical Incidents</h3>
              <p className="text-xs text-gray-400 mb-3">Cases solved using this knowledge</p>
              <div className="space-y-2">
                {article.related_tickets.map((t: any) => (
                  <Link
                    key={t.id}
                    href={`/incidents/${t.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <span className="text-xs font-mono font-bold text-green-800">{t.reference}</span>
                    {t.priority && <Badge variant={t.priority?.toLowerCase()}>{t.priority}</Badge>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Technical Contacts */}
          {article.contacts && article.contacts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Subject Matter Contacts</h3>
              <div className="space-y-2">
                {article.contacts.map((c: any) => (
                  <div key={c.id} className="text-xs p-2 bg-gray-50 rounded-lg">
                    <p className="font-bold text-gray-800">{c.name}</p>
                    {c.email && <p className="text-gray-500">{c.email}</p>}
                    {c.teams && <p className="text-gray-400 text-[10px] mt-0.5">{c.teams}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References & Links */}
          {article.references && article.references.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">References & Guides</h3>
              <div className="space-y-2">
                {article.references.map((ref: any) => (
                  <a
                    key={ref.id}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-green-800 hover:underline p-1.5 hover:bg-gray-50 rounded"
                  >
                    ↗ {ref.title || ref.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Temenos Support Contact */}
          {article.temenos_contact && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Temenos Contact</h3>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{article.temenos_contact}</p>
            </div>
          )}

          {/* General Notes */}
          {article.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">Internal Notes</h3>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{article.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              {reviewModal === "approve" ? "Approve Knowledge Article" : "Return Article for Correction"}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {reviewModal === "approve" ? "Approval Remarks (Optional)" : "Correction Feedback (Required)"}
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={reviewModal === "approve" ? "Looks good..." : "Please specify required corrections..."}
                rows={4}
                className="w-full text-xs border border-gray-300 rounded-lg p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReviewModal(null)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewAction}
                disabled={submitting || (reviewModal === "reject" && !reviewNote.trim())}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg text-white ${
                  reviewModal === "approve" ? "bg-green-700 hover:bg-green-800" : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50`}
              >
                {submitting ? "Processing..." : reviewModal === "approve" ? "Confirm Approval" : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
