"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";

function Section({ title, content, copyable = false }: { title: string; content: string | null; copyable?: boolean }) {
  if (!content) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
        {copyable && <CopyButton text={content} />}
      </div>
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100">
        {content}
      </div>
    </div>
  );
}

export default function KnowledgeArticlePage() {
  const params = useParams();
  const id = params.id as string;
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/knowledge/${id}`)
      .then((r) => r.json())
      .then(setArticle)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
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
        <p className="text-lg text-gray-600">Article not found</p>
        <Link href="/knowledge" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Knowledge
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <Link href="/knowledge" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← All Knowledge Articles
        </Link>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {article.group_code && (
            <Link href={`/groups/${article.group_code}`}>
              <Badge>Group {article.group_code}</Badge>
            </Link>
          )}
          {article.subtype_code && <Badge variant="published">{article.subtype_code}</Badge>}
          <Badge>{article.status}</Badge>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
        {article.group_name && (
          <p className="text-sm text-gray-500 mt-1">{article.group_name}</p>
        )}
      </div>

      {/* Main content — SRS §16 Problem/Solution separation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Primary content */}
        <div className="lg:col-span-2 space-y-6">
          <Section title="Problem / Symptoms" content={article.symptoms} />
          <Section title="Root Cause" content={article.root_cause} />
          <Section title="Diagnostic Information" content={article.diagnostic_data} copyable />
          <Section title="Immediate Fix" content={article.immediate_fix} />
          <Section title="Permanent Fix" content={article.permanent_fix} />
          <Section title="Prevention" content={article.prevention} />

          {/* Verification as checklist */}
          {article.verification && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Verification</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                {article.verification.split("\n").filter(Boolean).map((line: string, i: number) => (
                  <label key={i} className="flex items-start gap-2 text-sm text-gray-800 py-1 cursor-pointer">
                    <input type="checkbox" className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span>{line.replace(/^[✓☐☐\-\*\d\.]+\s*/, "")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Tickets — SRS §25 */}
          {article.related_tickets && article.related_tickets.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Historical Incidents</h3>
              <p className="text-xs text-gray-400 mb-3">Previous cases solved by this knowledge</p>
              <div className="space-y-2">
                {article.related_tickets.map((t: any) => (
                  <Link
                    key={t.id}
                    href={`/incidents/${t.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-blue-600 hover:underline font-mono">{t.reference}</span>
                    {t.priority && (
                      <Badge variant={t.priority?.toLowerCase()}>{t.priority}</Badge>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {article.contacts && article.contacts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Contacts</h3>
              <div className="space-y-2">
                {article.contacts.map((c: any) => (
                  <div key={c.id} className="text-sm">
                    <p className="font-medium text-gray-700">{c.name}</p>
                    {c.email && <p className="text-gray-500 text-xs">{c.email}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {article.references && article.references.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">References</h3>
              <div className="space-y-2">
                {article.references.map((ref: any) => (
                  <a
                    key={ref.id}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    {ref.title || ref.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Temenos Contact */}
          {article.temenos_contact && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Temenos Contact</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{article.temenos_contact}</p>
            </div>
          )}

          {/* Notes */}
          {article.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{article.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
