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

interface Reference {
  id?: number;
  title: string;
  url: string;
  reference_type: string;
  description: string;
}

interface Contact {
  id?: number;
  name: string;
  email: string;
  teams: string;
  phone: string;
  notes: string;
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
    change_summary: "",
  });

  const [references, setReferences] = useState<Reference[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

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
    const matchedGroup = groups.find((g) => g.id === parseInt(form.group_id));
    if (!matchedGroup) return;

    fetch(`/api/groups/${matchedGroup.code}`)
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
          change_summary: "",
        });
        if (data.references) {
          setReferences(
            data.references.map((r: any) => ({
              id: r.id,
              title: r.title || "",
              url: r.url || "",
              reference_type: r.reference_type || "",
              description: r.description || "",
            }))
          );
        }
        if (data.contacts) {
          setContacts(
            data.contacts.map((c: any) => ({
              id: c.id,
              name: c.name || "",
              email: c.email || "",
              teams: c.teams || "",
              phone: c.phone || "",
              notes: c.notes || "",
            }))
          );
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleReferenceChange = (index: number, field: keyof Reference, value: string) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    setReferences(updated);
  };

  const addReference = () => {
    setReferences([...references, { title: "", url: "", reference_type: "", description: "" }]);
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const addContact = () => {
    setContacts([...contacts, { name: "", email: "", teams: "", phone: "", notes: "" }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
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
      // Save article fields
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

      // Save references
      const refRes = await fetch(`/api/knowledge/${id}/references`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references }),
      });

      if (!refRes.ok) {
        const refData = await refRes.json();
        setError(refData.error || "Failed to update references");
        return;
      }

      // Save contacts
      const conRes = await fetch(`/api/knowledge/${id}/contacts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });

      if (!conRes.ok) {
        const conData = await conRes.json();
        setError(conData.error || "Failed to update contacts");
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
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/knowledge" className="hover:underline text-green-800">
          Knowledge Base
        </Link>
        <span>›</span>
        <Link href={`/knowledge/${id}`} className="hover:underline text-green-800">
          KB-{id}
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Edit Article</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Knowledge Article</h1>
          <p className="text-xs text-gray-500 mt-1">Update solution content, diagnostic steps, or classification</p>
        </div>
        <Link
          href={`/knowledge/${id}`}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Basic Information</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Technical Domain</label>
              <select
                name="group_id"
                value={form.group_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="">Select domain</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subgroup</label>
              <select
                name="subtype_id"
                value={form.subtype_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
                disabled={!form.group_id}
              >
                <option value="">Select subgroup</option>
                {subgroups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Workflow Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="draft">Draft (Private)</option>
                <option value="submitted">Submitted (For Review)</option>
                <option value="approved">Approved (Published)</option>
                <option value="rejected">Rejected (Needs Revision)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        {/* Revision Summary (Version History) */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
          <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            Version Snapshot & Revision Summary
          </h2>
          <p className="text-xs text-amber-800">
            Provide a short description of what was changed or improved. When saving an approved article, a historical version snapshot is preserved.
          </p>
          <input
            type="text"
            name="change_summary"
            value={form.change_summary}
            onChange={handleChange}
            placeholder="e.g. Added permanent fix steps for T24 R24 patch; updated verification commands"
            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-white"
          />
        </div>

        {/* Problem & Solution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Problem & Solution</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Problem / Symptoms</label>
            <textarea
              name="symptoms"
              value={form.symptoms}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Root Cause Analysis</label>
            <textarea
              name="root_cause"
              value={form.root_cause}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Diagnostic Commands & Logs</label>
            <textarea
              name="diagnostic_data"
              value={form.diagnostic_data}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Immediate Workaround / Quick Fix</label>
            <textarea
              name="immediate_fix"
              value={form.immediate_fix}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Permanent Solution / Fix</label>
            <textarea
              name="permanent_fix"
              value={form.permanent_fix}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Prevention & Safeguards</label>
              <textarea
                name="prevention"
                value={form.prevention}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Verification Steps</label>
              <textarea
                name="verification"
                value={form.verification}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* References */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">References & Documentation</h2>
            <button
              type="button"
              onClick={addReference}
              className="px-2.5 py-1 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              + Add Reference
            </button>
          </div>

          {references.map((ref, idx) => (
            <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Reference #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeReference(idx)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Title"
                  value={ref.title}
                  onChange={(e) => handleReferenceChange(idx, "title", e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="URL or Path"
                  value={ref.url}
                  onChange={(e) => handleReferenceChange(idx, "url", e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Contacts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subject Matter Contacts</h2>
            <button
              type="button"
              onClick={addContact}
              className="px-2.5 py-1 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              + Add Contact
            </button>
          </div>

          {contacts.map((contact, idx) => (
            <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Contact #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeContact(idx)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={contact.name}
                  onChange={(e) => handleContactChange(idx, "name", e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={contact.email}
                  onChange={(e) => handleContactChange(idx, "email", e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={contact.phone}
                  onChange={(e) => handleContactChange(idx, "phone", e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Information</h2>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Temenos Support Contact</label>
            <input
              type="text"
              name="temenos_contact"
              value={form.temenos_contact}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href={`/knowledge/${id}`}
            className="px-4 py-2 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-xs font-semibold rounded-lg text-white shadow-sm disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {saving ? "Saving Changes..." : "Save Knowledge Article"}
          </button>
        </div>
      </form>
    </div>
  );
}
