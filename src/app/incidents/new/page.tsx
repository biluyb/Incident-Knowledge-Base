"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const GROUP_FIELDS: Record<string, { key: string; label: string; type: string }[]> = {
  "G01": [
    { key: "cob_process", label: "COB Process", type: "text" },
    { key: "batch_job", label: "Batch/Job Name", type: "text" },
    { key: "service", label: "Affected Service", type: "text" },
    { key: "t24_routine", label: "T24 Routine", type: "text" },
    { key: "error_message", label: "Error Message", type: "textarea" },
  ],
  "G02": [
    { key: "account_type", label: "Account Type", type: "text" },
    { key: "product_code", label: "Product Code", type: "text" },
    { key: "operation", label: "Operation", type: "text" },
    { key: "error_block", label: "Error/Block", type: "text" },
  ],
  "G03": [
    { key: "interest_type", label: "Interest Type", type: "text" },
    { key: "product", label: "Product", type: "text" },
    { key: "accounting_issue", label: "Accounting Issue", type: "text" },
    { key: "t24_record", label: "T24 Record", type: "text" },
  ],
  "G04": [
    { key: "payment_type", label: "Payment Type", type: "text" },
    { key: "transaction_type", label: "Transaction Type", type: "text" },
    { key: "currency", label: "Currency", type: "text" },
    { key: "gl_account", label: "GL Account", type: "text" },
    { key: "posting_issue", label: "Posting Issue", type: "text" },
  ],
  "G05": [
    { key: "teller_vault", label: "Teller/Vault", type: "text" },
    { key: "transaction_type", label: "Transaction Type", type: "text" },
    { key: "branch", label: "Branch", type: "text" },
    { key: "operation", label: "Operation", type: "text" },
  ],
  "G06": [
    { key: "screening_type", label: "Screening Type", type: "text" },
    { key: "fcm_module", label: "FCM Module", type: "text" },
    { key: "aml_rule", label: "AML Rule", type: "text" },
    { key: "screening_result", label: "Screening Result", type: "text" },
  ],
  "G07": [
    { key: "limit_type", label: "Limit Type", type: "text" },
    { key: "overdraft_type", label: "Overdraft Type", type: "text" },
    { key: "restriction_type", label: "Restriction Type", type: "text" },
  ],
  "G08": [
    { key: "platform_component", label: "Platform Component", type: "text" },
    { key: "configuration", label: "Configuration", type: "text" },
    { key: "service", label: "Service", type: "text" },
    { key: "issue_type", label: "Issue Type", type: "text" },
  ],
};

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
    priority: "Medium",
    severity: "Severity 3",
    requester: "",
    root_cause_category: "",
  });
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

  // File upload state
  const [newTicketId, setNewTicketId] = useState<number | null>(null);
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

    setDynamicFields({});
  }, [form.group_id, groups]);

  const selectedGroupCode = groups.find((g) => String(g.id) === form.group_id)?.code || "";
  const groupDynamicFields = GROUP_FIELDS[selectedGroupCode] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        ...form,
        group_id: parseInt(form.group_id),
        subgroup_id: form.subgroup_id ? parseInt(form.subgroup_id) : null,
        dynamic_fields: dynamicFields,
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

  // Handle file selection (store for later upload after incident is created)
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
        <h1 className="text-2xl font-bold text-gray-900">Add Historical Incident</h1>
        <p className="text-sm text-gray-500 mt-1">Document a previously solved technical incident.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section: Incident Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Incident Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference *</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="TSR-XXXXXXXX"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="Brief incident title"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group *</label>
              <div className="flex gap-2">
                <select
                  value={form.group_id}
                  onChange={(e) => setForm({ ...form, group_id: e.target.value, subgroup_id: "" })}
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select group...</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewGroup(true)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 whitespace-nowrap"
                  style={{ color: "var(--primary)" }}
                  title="Create new group"
                >
                  + New
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subgroup</label>
              <div className="flex gap-2">
                <select
                  value={form.subgroup_id}
                  onChange={(e) => setForm({ ...form, subgroup_id: e.target.value })}
                  disabled={!form.group_id}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50 disabled:text-gray-400"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 whitespace-nowrap disabled:opacity-50"
                  style={{ color: "var(--primary)" }}
                  title="Create new subgroup"
                >
                  + New
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Classification */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Classification</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="Severity 1">Severity 1</option>
                <option value="Severity 2">Severity 2</option>
                <option value="Severity 3">Severity 3</option>
                <option value="Severity 4">Severity 4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requester</label>
              <input
                type="text"
                value={form.requester}
                onChange={(e) => setForm({ ...form, requester: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause Category</label>
            <input
              type="text"
              value={form.root_cause_category}
              onChange={(e) => setForm({ ...form, root_cause_category: e.target.value })}
              placeholder="e.g. Data Input Error, User Knowledge Gap"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Section: Group-Specific Fields */}
        {groupDynamicFields.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Technical Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {groupDynamicFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={dynamicFields[field.key] || ""}
                      onChange={(e) => setDynamicFields({ ...dynamicFields, [field.key]: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={dynamicFields[field.key] || ""}
                      onChange={(e) => setDynamicFields({ ...dynamicFields, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Attachments */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Attachments</h2>
          <p className="text-xs text-gray-400 mb-3">
            Upload screenshots, error logs, configuration files, or other evidence. Files will be attached after the incident is created.
          </p>
          {/* Pending files */}
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
              Drag & drop or <span className="font-medium" style={{ color: "var(--primary)" }}>click to add files</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF, TXT, CSV, DOC, XLS, ZIP, LOG — Max 10MB each</p>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? "Saving..." : "Save Incident"}
          </button>
          <Link href="/incidents" className="btn-secondary">
            Cancel
          </Link>
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
