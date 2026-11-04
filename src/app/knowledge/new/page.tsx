"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

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

interface Category {
  id: number;
  code: string;
  name: string;
  description: string;
}

function AddKnowledgeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromIncidentId = searchParams.get("from_incident");
  const { hasPermission } = useAuth();

  const [groups, setGroups] = useState<Group[]>([]);
  const [subtypes, setSubtypes] = useState<Subtype[]>([]);
  const [filteredSubtypes, setFilteredSubtypes] = useState<Subtype[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingIncident, setLoadingIncident] = useState(!!fromIncidentId);

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
    status: "draft",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch("/api/knowledge/categories").then((r) => r.json()),
      fromIncidentId
        ? fetch(`/api/incidents/${fromIncidentId}`).then((r) => r.json())
        : Promise.resolve(null),
    ])
      .then(([groupsData, catData, incidentData]) => {
        setGroups(groupsData || []);
        if (catData?.categories) setCategories(catData.categories);
        if (incidentData && !incidentData.error) {
          const matchedGroup = (groupsData || []).find(
            (g: Group) => g.code === incidentData.group_code || g.id === incidentData.group_id
          );
          setForm((prev) => ({
            ...prev,
            title: incidentData.summary || "",
            reference: incidentData.reference || "",
            group_id: matchedGroup ? String(matchedGroup.id) : "",
            subtype_id: incidentData.subgroup_id ? String(incidentData.subgroup_id) : "",
            symptoms: incidentData.problem_symptoms || "",
            root_cause: incidentData.root_cause || "",
            diagnostic_data: incidentData.diagnostic_information || "",
            immediate_fix: incidentData.immediate_fix || "",
            permanent_fix: incidentData.permanent_fix || "",
            prevention: incidentData.prevention || "",
            verification: incidentData.verification || "",
            temenos_contact: incidentData.temenos_contact || "",
            notes: incidentData.notes || "",
          }));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingIncident(false));
  }, [fromIncidentId]);

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

  const handleSave = async (targetStatus: "draft" | "submitted" | "approved") => {
    setSaving(true);
    setError("");

    try {
      const payload = { ...form, status: targetStatus };
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save article");
        return;
      }
      router.push(`/knowledge/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  const canApprove = hasPermission("knowledge.approve");
  const fieldClass = "w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-green-600 outline-none";
  const textAreaClass = `${fieldClass} min-h-[80px] resize-y`;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/knowledge" className="text-xs text-gray-500 hover:underline mb-2 inline-block">
          ← Knowledge Articles
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Knowledge Article</h1>
        {fromIncidentId ? (
          <p className="text-xs text-gray-500 mt-1">
            Converting resolved incident <span className="font-mono font-bold text-gray-700">{form.reference}</span> into reusable knowledge. Fields are pre-filled — review and submit.
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Document technical procedures, system configurations, or solutions to recurring problems
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Article Identification */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            1. Article Identification & Classification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Article Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Resolution for AA.CREATE.NAU.ACTIVITIES Lockup During EOD"
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Related TSR Reference</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => update("reference", e.target.value)}
                placeholder="TSR-XXXXXXX (Optional)"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Technical Domain (Group) *</label>
              <select
                value={form.group_id}
                onChange={(e) => update("group_id", e.target.value)}
                required
                className={fieldClass}
              >
                <option value="">Select technical domain...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code} — {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subgroup Taxonomy</label>
              <select
                value={form.subtype_id}
                onChange={(e) => update("subtype_id", e.target.value)}
                className={fieldClass}
                disabled={!form.group_id}
              >
                <option value="">Select subgroup...</option>
                {filteredSubtypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Problem & Diagnosis */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            2. Problem Description & Diagnosis
          </h2>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Problem / Symptoms Observed *</label>
            <textarea
              value={form.symptoms}
              onChange={(e) => update("symptoms", e.target.value)}
              placeholder="Describe what occurred, error messages, affected applications, and impact..."
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Root Cause Analysis</label>
            <textarea
              value={form.root_cause}
              onChange={(e) => update("root_cause", e.target.value)}
              placeholder="Underlying technical cause (e.g. record lock, index fragmentation, routine defect)..."
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Diagnostic Commands & Logs</label>
            <textarea
              value={form.diagnostic_data}
              onChange={(e) => update("diagnostic_data", e.target.value)}
              placeholder="Commands, SQL queries, jBASE commands, or log paths used to isolate the issue..."
              className={textAreaClass}
            />
          </div>
        </div>

        {/* Resolution & Prevention */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            3. Solution & Prevention
          </h2>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Immediate Workaround / Quick Fix</label>
            <textarea
              value={form.immediate_fix}
              onChange={(e) => update("immediate_fix", e.target.value)}
              placeholder="Step-by-step actions taken to restore service immediately..."
              className={textAreaClass}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Permanent Solution / Fix</label>
            <textarea
              value={form.permanent_fix}
              onChange={(e) => update("permanent_fix", e.target.value)}
              placeholder="Long-term fix, patch, configuration update, or code revision..."
              className={textAreaClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Preventative Safeguards</label>
              <textarea
                value={form.prevention}
                onChange={(e) => update("prevention", e.target.value)}
                placeholder="Monitoring, alerts, or procedural checks to prevent recurrence..."
                className={textAreaClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Verification Checklist</label>
              <textarea
                value={form.verification}
                onChange={(e) => update("verification", e.target.value)}
                placeholder="One checklist item per line (e.g. ✓ Verified balance, ✓ COB completed)..."
                className={textAreaClass}
              />
            </div>
          </div>
        </div>

        {/* Additional Reference Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            4. Support Contacts & Documentation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Temenos Support Engineer / Reference</label>
              <input
                type="text"
                value={form.temenos_contact}
                onChange={(e) => update("temenos_contact", e.target.value)}
                placeholder="Temenos case engineer or contact"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Additional Internal Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Any special remarks or lessons learned..."
                className={textAreaClass}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            href="/knowledge"
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving || !form.title || !form.group_id}
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>

            <button
              type="button"
              onClick={() => handleSave("submitted")}
              disabled={saving || !form.title || !form.group_id}
              className="px-5 py-2 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50 transition-colors"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {saving ? "Submitting..." : "Submit for Review →"}
            </button>

            {canApprove && (
              <button
                type="button"
                onClick={() => handleSave("approved")}
                disabled={saving || !form.title || !form.group_id}
                className="px-4 py-2 bg-green-800 text-white text-xs font-semibold rounded-lg hover:bg-green-900 shadow-sm disabled:opacity-50 transition-colors"
              >
                Publish Directly
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AddKnowledgePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl border border-gray-200 animate-pulse" />
        </div>
      }
    >
      <AddKnowledgeForm />
    </Suspense>
  );
}
