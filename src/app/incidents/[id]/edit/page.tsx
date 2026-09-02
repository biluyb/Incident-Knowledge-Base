"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FileUpload } from "@/components/ui/FileUpload";

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

export default function EditIncidentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

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
  const [files, setFiles] = useState<any[]>([]);

  // Inline group/subgroup creation state
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewSubgroup, setShowNewSubgroup] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ code: "", name: "", description: "" });
  const [newSubgroupForm, setNewSubgroupForm] = useState({ code: "", name: "", description: "" });
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingSubgroup, setCreatingSubgroup] = useState(false);

  const loadFiles = useCallback(() => {
    fetch(`/api/files?ticket_id=${id}`).then((r) => r.json()).then((data) => {
      setFiles(Array.isArray(data) ? data : []);
    }).catch(console.error);
  }, [id]);

  useEffect(() => {
    Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch(`/api/incidents/${id}`).then((r) => r.json()),
    ])
      .then(([groupsData, ticketData]) => {
        setGroups(groupsData);
        if (ticketData.error) {
          setError(ticketData.error);
        } else {
          const matchedGroup = groupsData.find(
            (g: Group) => g.code === ticketData.group_code || g.id === ticketData.group_id
          );
          setForm({
            reference: ticketData.reference || "",
            summary: ticketData.summary || "",
            group_id: matchedGroup ? String(matchedGroup.id) : "",
            subgroup_id: ticketData.subgroup_id ? String(ticketData.subgroup_id) : "",
            root_cause: ticketData.root_cause || "",
            solution: ticketData.immediate_fix || ticketData.permanent_fix || "",
            verification: ticketData.verification || "",
            notes: ticketData.notes || "",
          });
        }
      })
      .catch(() => setError("Failed to load incident"))
      .finally(() => setLoading(false));

    loadFiles();
  }, [id, loadFiles]);

  useEffect(() => {
    if (!form.group_id) {
      setSubgroups([]);
      return;
    }
    const selectedGroup = groups.find((g) => String(g.id) === form.group_id);
    if (!selectedGroup) return;

    fetch(`/api/groups/${selectedGroup.code}`)
      .then((r) => r.json())
      .then((data) => setSubgroups(data.subtypes || []))
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
      };

      const res = await fetch(`/api/incidents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update incident");
        return;
      }

      router.push(`/incidents/${id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/incidents/${id}`} className="hover:underline" style={{ color: "var(--primary)" }}>{form.reference}</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Incident</h1>
        <p className="text-sm text-gray-500 mt-1">Update incident details.</p>
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
                  <option value="">{subgroups.length === 0 ? "No subgroups" : "Select subgroup..."}</option>
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

        {/* File Uploads */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Attachments</h2>
          <FileUpload ticketId={parseInt(id)} files={files} onFilesChanged={loadFiles} />
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/incidents/${id}`} className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={submitting} className="btn-primary">
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
