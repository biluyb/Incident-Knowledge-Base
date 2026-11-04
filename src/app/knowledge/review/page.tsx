"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Badge } from "@/components/ui/Badge";

interface ReviewArticle {
  id: number;
  title: string;
  group_code: string;
  group_name: string;
  subtype_code: string | null;
  subtype_name: string | null;
  status: string;
  symptoms: string | null;
  root_cause: string | null;
  immediate_fix: string | null;
  permanent_fix: string | null;
  created_at: string;
  updated_at: string;
}

export default function KnowledgeReviewQueuePage() {
  const { hasPermission, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState<ReviewArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ReviewArticle | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchPendingArticles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/knowledge?status=pending");
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingArticles();
  }, []);

  const handleReviewAction = async () => {
    if (!selectedArticle || !modalAction) return;

    setActionLoading(selectedArticle.id);
    try {
      const res = await fetch(`/api/knowledge/${selectedArticle.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: modalAction,
          notes: reviewNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Failed to process review action", type: "error" });
        return;
      }

      setMessage({
        text: `Article "${selectedArticle.title}" ${modalAction === "approve" ? "approved" : "rejected"} successfully.`,
        type: "success",
      });
      setSelectedArticle(null);
      setModalAction(null);
      setReviewNotes("");
      await fetchPendingArticles();
    } catch {
      setMessage({ text: "Network error processing review", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-gray-500">Checking authorization...</div>;
  }

  if (!hasPermission("knowledge.approve")) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl max-w-2xl mx-auto my-12 text-center">
        <h2 className="text-lg font-bold">Access Restricted</h2>
        <p className="mt-2 text-sm">
          Knowledge review and approval requires Team Lead, Knowledge Manager, or Administrator privileges.
        </p>
        <Link href="/knowledge" className="inline-block mt-4 text-sm font-medium underline">
          Return to Knowledge Base
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/knowledge" className="text-xs text-gray-500 hover:underline">
              ← Knowledge Base
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Review & Approval Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review submitted technical procedures and incident solutions before publishing to the team
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPendingArticles}
            className="px-3 py-2 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
          >
            Refresh Queue
          </button>
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
            {articles.length} Pending Review
          </span>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-base font-semibold text-gray-900">All Caught Up!</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            There are no submitted knowledge articles waiting for review. New submissions will appear here.
          </p>
          <Link
            href="/knowledge"
            className="mt-4 inline-block text-sm font-medium px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Browse Approved Knowledge
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-300 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="warning">{article.status.toUpperCase()}</Badge>
                    {article.group_code && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {article.group_code} — {article.group_name}
                      </span>
                    )}
                    {article.subtype_code && (
                      <span className="text-xs text-gray-500">[{article.subtype_code}]</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    <Link href={`/knowledge/${article.id}`} className="hover:underline">
                      {article.title}
                    </Link>
                  </h3>

                  {article.symptoms && (
                    <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                      <span className="font-semibold text-gray-700">Symptoms: </span>
                      {article.symptoms}
                    </div>
                  )}

                  {article.immediate_fix && (
                    <div className="mt-1 text-xs text-gray-600 line-clamp-2">
                      <span className="font-semibold text-gray-700">Fix Summary: </span>
                      {article.immediate_fix}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  <Link
                    href={`/knowledge/${article.id}`}
                    target="_blank"
                    className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Full Details
                  </Link>

                  <button
                    onClick={() => {
                      setSelectedArticle(article);
                      setModalAction("reject");
                      setReviewNotes("");
                    }}
                    disabled={actionLoading === article.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                  >
                    Reject / Return
                  </button>

                  <button
                    onClick={() => {
                      setSelectedArticle(article);
                      setModalAction("approve");
                      setReviewNotes("");
                    }}
                    disabled={actionLoading === article.id}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors shadow-sm"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    Approve & Publish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedArticle && modalAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {modalAction === "approve" ? "Approve Knowledge Article" : "Reject / Return Article"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Article: <span className="font-semibold">{selectedArticle.title}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedArticle(null);
                  setModalAction(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {modalAction === "approve" ? "Approval Notes (Optional)" : "Reason for Rejection / Feedback (Required)"}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  modalAction === "approve"
                    ? "Add any comments or verification remarks..."
                    : "Explain what needs correction or why this article cannot be published..."
                }
                rows={4}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:border-green-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedArticle(null);
                  setModalAction(null);
                }}
                className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewAction}
                disabled={actionLoading !== null || (modalAction === "reject" && !reviewNotes.trim())}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg text-white ${
                  modalAction === "approve" ? "bg-green-700 hover:bg-green-800" : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50`}
              >
                {actionLoading ? "Processing..." : modalAction === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
