"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

interface Group {
  id: number;
  code: string;
  name: string;
}

interface Subgroup {
  id: number;
  code: string;
  name: string;
}

export default function EditKnowledgePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);

  const [form, setForm] = useState({
    title: "",
    group_id: "",
    subtype_id: "",
    status: "published",
    symptoms: "",
    root_cause: "",
    diagnostic_data: "",
    immediate_fix: "",
    permanent_fix: "",
    prevention: "",
    verification: "",
    temenos_contact: "",
    notes: "",
  });

  // Load groups
  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error);
  }, []);

  // Load subgroups when group changes
  useEffect(() => {
    if (!form.group_id) {
      setSubgroups([]);
      return;
    }
    fetch(`/api/groups/${groups.find(g => g.id === parseInt(form.group_id))?.code || ""}`)
      .then((r) => r.json())
      .then((data) => setSubgroups(data.subtypes || []))
      .catch(console.error);
  }, [form.group_id, groups]);

  // Load existing article
  useEffect(() => {
    if (!id) return;
    fetch(`/api/knowledge/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setForm({
          title: data.title || "",
          group_id: data.group_id ? String(data.group_id) : "",
          subtype_id: data.subtype_id ? String(data.subtype_id) : "",
          status: data.status || "published",
          symptoms: data.symptoms || "",
          root_cause: data.root_cause || "",
          diagnostic_data: data.diagnostic_data || "",
          immediate_fix: data.immediate_fix || "",
          permanent_fix: data.permanent_fix || "",
          prevention: data.prevention || "",
          verification: data.verification || "",
          temenos_contact: data.temenos_contact || "",
          notes: data.notes || "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          group_id: form.group_id ? parseInt(form.group_id) : null,
          subtype_id: form.subtype_id ? parseInt(form.subtype_id) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update article");
        return;
      }

      router.push(`/knowledge/${id}`);
    } catch {
      setError("Network error saving article");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/knowledge" className="hover:underline" style={{ color: "var(--primary)" }}>Knowledge</Link>
        <span>›</span>
        <Link href={`/knowledge/${id}`} className="hover:underline" style={{ color: "var(--primary)" }}>Article {id}</Link>
        <span>›</span>
        <span className="text-gray-900">Edit</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Knowledge Article</h1>
          <p className="text-sm text-gray-500 mt-1">Update the knowledge base solution.</p>
        </div>
        <Link href={`/knowledge/${id}`} className="btn-secondary text-xs">
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Basic Information</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Group</label>
              <select
                name="group_id"
                value={form.group_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Select group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subgroup</label>
              <select
                name="subtype_id"
                value={form.subtype_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Select subgroup</option>
                {subgroups.map((sg) => (
                  <option key={sg.id} value={sg.id}>{sg.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Solution Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Solution Content</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Problem / Symptoms</label>
            <textarea
              name="symptoms"
              value={form.symptoms}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="What happened? What did the system show?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Root Cause</label>
            <textarea
              name="root_cause"
              value={form.root_cause}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Why did the problem happen?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Diagnostic Commands</label>
            <textarea
              name="diagnostic_data"
              value={form.diagnostic_data}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              placeholder="SQL queries, commands, or diagnostic steps"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Immediate Fix</label>
            <textarea
              name="immediate_fix"
              value={form.immediate_fix}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="What was done to resolve the problem quickly?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Permanent Fix</label>
            <textarea
              name="permanent_fix"
              value={form.permanent_fix}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="What is the long-term solution?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Prevention</label>
            <textarea
              name="prevention"
              value={form.prevention}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="How to prevent this issue in the future?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Verification Steps</label>
            <textarea
              name="verification"
              value={form.verification}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="How was the solution confirmed? (one step per line)"
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Additional Information</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Temenos Contact</label>
            <input
              type="text"
              name="temenos_contact"
              value={form.temenos_contact}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link href={`/knowledge/${id}`} className="btn-secondary text-xs">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
