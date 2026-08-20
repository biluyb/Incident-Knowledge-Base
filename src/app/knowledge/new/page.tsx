"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Group {
  id: number;
  code: string;
  name: string;
}

interface Subtype {
  id: number;
  code: string;
  name: string;
  group_id: number;
}

export default function AddKnowledgePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [subtypes, setSubtypes] = useState<Subtype[]>([]);
  const [filteredSubtypes, setFilteredSubtypes] = useState<Subtype[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    reference: "",
    group_id: "",
    subtype_id: "",
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

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.group_id) {
      setFilteredSubtypes([]);
      return;
    }
    fetch(`/api/groups/${form.group_id}`)
      .then((r) => r.json())
      .then((data) => setFilteredSubtypes(data.subtypes || []))
      .catch(console.error);
  }, [form.group_id]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      router.push(`/knowledge/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none";
  const textAreaClass = `${fieldClass} min-h-[80px] resize-y`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/knowledge" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Knowledge Articles
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Historical Incident</h1>
        <p className="text-sm text-gray-500 mt-1">
          Record a newly solved incident into the knowledge archive
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ticket Reference */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Incident Identification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ticket Reference *</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => update("reference", e.target.value)}
                placeholder="TSR-XXXXXXXX"
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Brief description of the issue"
                required
                className={fieldClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Group *</label>
              <select
                value={form.group_id}
                onChange={(e) => update("group_id", e.target.value)}
                required
                className={fieldClass}
              >
                <option value="">Select group...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Sub-Type</label>
              <select
                value={form.subtype_id}
                onChange={(e) => update("subtype_id", e.target.value)}
                className={fieldClass}
                disabled={!form.group_id}
              >
                <option value="">Select sub-type...</option>
                {filteredSubtypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Problem / Solution — SRS §16 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Problem & Solution
          </h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Problem / Symptoms</label>
            <textarea
              value={form.symptoms}
              onChange={(e) => update("symptoms", e.target.value)}
              placeholder="What happened? Describe the symptoms and error messages..."
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Root Cause</label>
            <textarea
              value={form.root_cause}
              onChange={(e) => update("root_cause", e.target.value)}
              placeholder="Why did it happen?"
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Diagnostic Information</label>
            <textarea
              value={form.diagnostic_data}
              onChange={(e) => update("diagnostic_data", e.target.value)}
              placeholder="What commands, logs, or data were used to identify the issue?"
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Immediate Fix</label>
            <textarea
              value={form.immediate_fix}
              onChange={(e) => update("immediate_fix", e.target.value)}
              placeholder="What fixed the specific incident?"
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Permanent Fix</label>
            <textarea
              value={form.permanent_fix}
              onChange={(e) => update("permanent_fix", e.target.value)}
              placeholder="How should the underlying problem be fixed?"
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Prevention</label>
            <textarea
              value={form.prevention}
              onChange={(e) => update("prevention", e.target.value)}
              placeholder="How can we avoid this happening again?"
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Verification</label>
            <textarea
              value={form.verification}
              onChange={(e) => update("verification", e.target.value)}
              placeholder="How do we know the solution worked?"
              className={textAreaClass}
            />
          </div>
        </div>

        {/* Additional info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Additional Information
          </h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Temenos Contact</label>
            <input
              type="text"
              value={form.temenos_contact}
              onChange={(e) => update("temenos_contact", e.target.value)}
              placeholder="Temenos support contact if applicable"
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any additional notes or context"
              className={textAreaClass}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/knowledge"
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !form.title || !form.reference || !form.group_id}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save to Knowledge Archive"}
          </button>
        </div>
      </form>
    </div>
  );
}
