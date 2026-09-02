"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function NewIncidentPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    reference: "",
    summary: "",
    group_id: "",
    subgroup_id: "",
    root_cause: "",
    solution: "",
    verification: "",
    notes: "",
  });

  // File upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Inline group/subgroup creation state
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewSubgroup, setShowNewSubgroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ code: "", name: "", description: "" });
  const [newSubgroupForm, setNewSubgroupForm] = useState({ code: "", name: "", description: "" });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingSubgroup, setCreatingSubgroup] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.group_id) {
      setSubgroups([]);
      setForm((f) => ({ ...f, subgroup_id: "" }));
      return;
    }
    const selectedGroup = groups.find((g) => String(g.id) === form.group_id);
    if (!selectedGroup) return;

    fetch(`/api/groups/${selectedGroup.code}`)
      .then((r) => r.json())
      .then((data) => {
        setSubgroups(data.subtypes || []);
        setForm((f) => ({ ...f, subgroup_id: "" }));
      })
      .catch(console.error);
  }, [form.group_id, groups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        reference: form.reference.trim(),
        summary: form.summary.trim(),
        group_id: parseInt(form.group_id),
        subgroup_id: form.subgroup_id ? parseInt(form.subgroup_id) : null,
        problem_symptoms: form.summary.trim(),
        root_cause: form.root_cause || null,
        immediate_fix: form.solution || null,
        verification: form.verification || null,
        notes: form.notes || null,
        priority: "Medium",
        severity: "Severity 3",
        status: "Permanently Closed",
      };

      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create incident");
        return;
      }

      // Upload pending files if any
      const createdId = data.id;
      if (pendingFiles.length > 0 && createdId) {
        for (const file of pendingFiles) {
          const formData = new FormData();
          formData.append("ticket_id", String(createdId));
          formData.append("file", file);
          await fetch("/api/files", { method: "POST", body: formData }).catch(() => {});
        }
      }

      router.push(`/incidents/${createdId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Inline group creation
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingGroup(true);
    setError("");
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGroupForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create group");
        return;
      }
      const groupsRes = await fetch("/api/groups");
      const updatedGroups = await groupsRes.json();
      setGroups(updatedGroups);
      const newGroup = updatedGroups.find((g: Group) => g.code === newGroupForm.code.toUpperCase());
      if (newGroup) {
        setForm((f) => ({ ...f, group_id: String(newGroup.id), subgroup_id: "" }));
      }
      setShowNewGroup(false);
      setNewGroupForm({ code: "", name: "", description: "" });
    } catch {
      setError("Network error creating group");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Inline subgroup creation
  const handleCreateSubgroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSubgroup(true);
    setError("");
    try {
      const payload = {
        ...newSubgroupForm,
        group_id: parseInt(form.group_id),
      };
      const res = await fetch("/api/admin/subgroups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create subgroup");
        return;
      }
      const selectedGroup = groups.find((g) => String(g.id) === form.group_id);
      if (selectedGroup) {
        const sgRes = await fetch(`/api/groups/${selectedGroup.code}`);
        const sgData = await sgRes.json();
        setSubgroups(sgData.subtypes || []);
      }
      setShowNewSubgroup(false);
      setNewSubgroupForm({ code: "", name: "", description: "" });
    } catch {
      setError("Network error creating subgroup");
    } finally {
      setCreatingSubgroup(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/incidents" className="hover:underline" style={{ color: "var(--primary)" }}>Incidents</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Add Incident</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add New Incident</h1>
        <p className="text-sm text-gray-500 mt-1">Document a technical incident for future knowledge reference.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Incident Header Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Incident Reference *</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="TSR-XXXXXXXX"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title / Summary *</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Brief incident title"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group *</label>
              <div className="flex gap-2 items-center">
                <select
                  value={form.group_id}
                  onChange={(e) => setForm({ ...form, group_id: e.target.value, subgroup_id: "" })}
                  required
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">Select group...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewGroup(true)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 whitespace-nowrap flex-shrink-0"
                  style={{ color: "var(--primary)" }}
                  title="Create new group"
                >
                  + New
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subgroup</label>
              <div className="flex gap-2 items-center">
                <select
                  value={form.subgroup_id}
                  onChange={(e) => setForm({ ...form, subgroup_id: e.target.value })}
                  disabled={!form.group_id}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">
                    {subgroups.length === 0 ? "No subgroups" : "Select subgroup..."}
                  </option>
                  {subgroups.map((sg) => (
                    <option key={sg.id} value={sg.id}>{sg.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewSubgroup(true)}
                  disabled={!form.group_id}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 whitespace-nowrap flex-shrink-0 disabled:opacity-50"
                  style={{ color: "var(--primary)" }}
                  title="Create new subgroup"
                >
                  + New
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Problem & Solution */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Problem & Solution</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause</label>
            <textarea
              value={form.root_cause}
              onChange={(e) => setForm({ ...form, root_cause: e.target.value })}
              placeholder="What caused the issue?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solution / Fix</label>
            <textarea
              value={form.solution}
              onChange={(e) => setForm({ ...form, solution: e.target.value })}
              placeholder="What was done to resolve it?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
            <textarea
              value={form.verification}
              onChange={(e) => setForm({ ...form, verification: e.target.value })}
              placeholder="How was it confirmed that the issue was fixed?"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>

        {/* Section: Additional Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Additional Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional useful information, warnings, or prevention tips..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>

        {/* Section: Attachments */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Attachments</h2>
          {pendingFiles.length > 0 && (
            <div className="space-y-1 mb-3">
              {pendingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
                  <span className="text-xs text-gray-400">📎</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingFile(idx)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors border-gray-300">
            <input type="file" className="hidden" multiple onChange={handleFileAdd} />
            <p className="text-sm text-gray-500">
              Drag & drop or <span className="font-medium" style={{ color: "var(--primary)" }}>click to upload file</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF, TXT, CSV, DOC, XLS, ZIP, LOG — Max 10MB each</p>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link href="/incidents" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? "Saving..." : "Save Incident"}
          </button>
        </div>
      </form>

      {/* Inline New Group Modal */}
      {showNewGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Create New Group</h3>
            </div>
            <form onSubmit={handleCreateGroup} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={newGroupForm.code}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, code: e.target.value })}
                  placeholder="e.g. PAYMENTS-DIGITAL"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, name: e.target.value })}
                  placeholder="e.g. Payments & Digital Channels"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newGroupForm.description}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={creatingGroup} className="btn-primary text-sm">
                  {creatingGroup ? "Creating..." : "Create Group"}
                </button>
                <button type="button" onClick={() => setShowNewGroup(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inline New Subgroup Modal */}
      {showNewSubgroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Create New Subgroup</h3>
            </div>
            <form onSubmit={handleCreateSubgroup} className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  Adding to: <strong>{groups.find((g) => String(g.id) === form.group_id)?.name}</strong>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={newSubgroupForm.code}
                  onChange={(e) => setNewSubgroupForm({ ...newSubgroupForm, code: e.target.value })}
                  placeholder="e.g. ST-G01-01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newSubgroupForm.name}
                  onChange={(e) => setNewSubgroupForm({ ...newSubgroupForm, name: e.target.value })}
                  placeholder="e.g. Funds Transfer Failures"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newSubgroupForm.description}
                  onChange={(e) => setNewSubgroupForm({ ...newSubgroupForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={creatingSubgroup} className="btn-primary text-sm">
                  {creatingSubgroup ? "Creating..." : "Create Subgroup"}
                </button>
                <button type="button" onClick={() => setShowNewSubgroup(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
