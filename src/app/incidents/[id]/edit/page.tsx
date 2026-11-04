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

interface User {
  id: number;
  name: string;
  email: string;
}

export default function EditIncidentPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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
    status: "investigating",
    assigned_to: "",
    temenos_status: "",
    follow_up_date: "",
    problem_symptoms: "",
    root_cause: "",
    solution: "",
    verification: "",
    temenos_contact: "",
    notes: "",
  });

  const [files, setFiles] = useState<any[]>([]);

  const loadFiles = useCallback(() => {
    fetch(`/api/files?ticket_id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        setFiles(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    Promise.all([
      fetch("/api/groups").then((r) => r.json()),
      fetch(`/api/incidents/${id}`).then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()).catch(() => ({ users: [] })),
    ])
      .then(([groupsData, ticketData, usersData]) => {
        setGroups(groupsData || []);
        setUsers(usersData.users || []);

        if (ticketData.error) {
          setError(ticketData.error);
        } else {
          const matchedGroup = (groupsData || []).find(
            (g: Group) => g.code === ticketData.group_code || g.id === ticketData.group_id
          );
          setForm({
            reference: ticketData.reference || "",
            summary: ticketData.summary || "",
            group_id: matchedGroup ? String(matchedGroup.id) : "",
            subgroup_id: ticketData.subgroup_id ? String(ticketData.subgroup_id) : "",
            priority: ticketData.priority || "Medium",
            severity: ticketData.severity || "Severity 3",
            status: ticketData.status || "investigating",
            assigned_to: ticketData.assigned_to ? String(ticketData.assigned_to) : "",
            temenos_status: ticketData.temenos_status || "",
            follow_up_date: ticketData.follow_up_date ? ticketData.follow_up_date.split("T")[0] : "",
            problem_symptoms: ticketData.problem_symptoms || ticketData.summary || "",
            root_cause: ticketData.root_cause || "",
            solution: ticketData.immediate_fix || ticketData.permanent_fix || "",
            verification: ticketData.verification || "",
            temenos_contact: ticketData.temenos_contact || "",
            notes: ticketData.notes || "",
          });
        }
      })
      .catch(() => setError("Failed to load incident details"))
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

  const update = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload = {
        reference: form.reference.trim(),
        summary: form.summary.trim(),
        group_id: form.group_id ? parseInt(form.group_id) : null,
        subgroup_id: form.subgroup_id ? parseInt(form.subgroup_id) : null,
        priority: form.priority,
        severity: form.severity,
        status: form.status,
        assigned_to: form.assigned_to ? parseInt(form.assigned_to) : null,
        temenos_status: form.temenos_status || null,
        follow_up_date: form.follow_up_date || null,
        problem_symptoms: form.problem_symptoms || null,
        root_cause: form.root_cause || null,
        immediate_fix: form.solution || null,
        verification: form.verification || null,
        temenos_contact: form.temenos_contact || null,
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
      setError("Network error updating incident");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = "w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-green-600 outline-none";
  const textAreaClass = `${fieldClass} min-h-[75px] resize-y`;

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/incidents" className="hover:underline text-green-800">
          Incidents
        </Link>
        <span>›</span>
        <Link href={`/incidents/${id}`} className="hover:underline text-green-800">
          {form.reference}
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Edit Incident</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Incident {form.reference}</h1>
          <p className="text-xs text-gray-500 mt-1">Update investigation details, status, or assignment</p>
        </div>
        <Link
          href={`/incidents/${id}`}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identification & Ownership */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            1. Identification & Ownership
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">TSR Reference Number *</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => update("reference", e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assign Internal Owner</label>
              <select
                value={form.assigned_to}
                onChange={(e) => update("assigned_to", e.target.value)}
                className={fieldClass}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Incident Summary / Problem Title *</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => update("summary", e.target.value)}
              required
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Technical Domain *</label>
              <select
                value={form.group_id}
                onChange={(e) => update("group_id", e.target.value)}
                required
                className={fieldClass}
              >
                <option value="">Select domain...</option>
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
                value={form.subgroup_id}
                onChange={(e) => update("subgroup_id", e.target.value)}
                className={fieldClass}
                disabled={!form.group_id}
              >
                <option value="">Select subgroup...</option>
                {subgroups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Priority & Temenos Tracking */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            2. Priority, Status & Temenos Tracking
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => update("priority", e.target.value)}
                className={fieldClass}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => update("severity", e.target.value)}
                className={fieldClass}
              >
                <option value="Severity 1">Severity 1</option>
                <option value="Severity 2">Severity 2</option>
                <option value="Severity 3">Severity 3</option>
                <option value="Severity 4">Severity 4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Status</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className={fieldClass}
              >
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="investigating">Investigating</option>
                <option value="waiting_for_temenos">Waiting for Temenos</option>
                <option value="waiting_for_internal_team">Waiting for Internal Team</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="reopened">Reopened</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={(e) => update("follow_up_date", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Official Temenos Portal Status</label>
              <input
                type="text"
                value={form.temenos_status}
                onChange={(e) => update("temenos_status", e.target.value)}
                placeholder="e.g. Under Analysis, Waiting for Bank, Delivered"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Temenos Support Contact</label>
              <input
                type="text"
                value={form.temenos_contact}
                onChange={(e) => update("temenos_contact", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Technical Details & Solution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            3. Technical Investigation & Solution
          </h2>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Problem / Symptoms</label>
            <textarea
              value={form.problem_symptoms}
              onChange={(e) => update("problem_symptoms", e.target.value)}
              className={textAreaClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Root Cause Analysis</label>
            <textarea
              value={form.root_cause}
              onChange={(e) => update("root_cause", e.target.value)}
              className={textAreaClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Applied Workaround / Solution</label>
            <textarea
              value={form.solution}
              onChange={(e) => update("solution", e.target.value)}
              className={textAreaClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Verification Steps</label>
            <textarea
              value={form.verification}
              onChange={(e) => update("verification", e.target.value)}
              className={textAreaClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className={textAreaClass}
            />
          </div>
        </div>

        {/* Section 4: Attachments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-sm">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            4. File Attachments
          </h2>
          <FileUpload ticketId={parseInt(id)} files={files} onFilesChanged={loadFiles} />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href={`/incidents/${id}`}
            className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 text-xs font-semibold rounded-lg text-white shadow-sm disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {submitting ? "Saving Changes..." : "Save Incident Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
