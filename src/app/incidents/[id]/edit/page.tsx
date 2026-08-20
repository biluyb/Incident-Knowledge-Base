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
    priority: "",
    severity: "",
    requester: "",
    root_cause_category: "",
  });
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

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
            priority: ticketData.priority || "Medium",
            severity: ticketData.severity || "Severity 3",
            requester: ticketData.requester || "",
            root_cause_category: ticketData.root_cause_category || "",
          });
          setDynamicFields(ticketData.custom_fields || {});
        }
      })
      .catch(() => setError("Failed to load incident"))
      .finally(() => setLoading(false));
  }, [id]);

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
        <p className="text-sm text-gray-500 mt-1">Update incident details. Created date and reference are preserved.</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input
              type="text"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
              <select
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select group...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subgroup</label>
              <select
                value={form.subgroup_id}
                onChange={(e) => setForm({ ...form, subgroup_id: e.target.value })}
                disabled={!form.group_id || subgroups.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
              >
                <option value="">{subgroups.length === 0 ? "No subgroups" : "Select subgroup..."}</option>
                {subgroups.map((sg) => (
                  <option key={sg.id} value={sg.id}>{sg.name}</option>
                ))}
              </select>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Group-Specific Fields */}
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

        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Saving..." : "Save Changes"}
          </button>
          <Link href={`/incidents/${id}`} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
