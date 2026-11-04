"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FileUpload } from "@/components/ui/FileUpload";
import { useAuth } from "@/components/AuthProvider";
import { Badge } from "@/components/ui/Badge";

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { hasPermission } = useAuth();

  const [ticket, setTicket] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [temenosStatusInput, setTemenosStatusInput] = useState("");
  const [followUpDateInput, setFollowUpDateInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchIncidentData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      fetch(`/api/incidents/${id}`).then((r) => r.json()),
      fetch(`/api/files?ticket_id=${id}`).then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()).catch(() => ({ users: [] })),
    ])
      .then(([ticketData, filesData, usersData]) => {
        if (ticketData.error) throw new Error(ticketData.error);
        setTicket(ticketData);
        setFiles(Array.isArray(filesData) ? filesData : []);
        setUsers(usersData.users || []);
        setSelectedStatus(ticketData.status || "investigating");
        setTemenosStatusInput(ticketData.temenos_status || "");
        setFollowUpDateInput(ticketData.follow_up_date ? ticketData.follow_up_date.split("T")[0] : "");
      })
      .catch(() => setError("Unable to load incident. It may not exist or there was a connection error."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchIncidentData();
  }, [fetchIncidentData]);

  const loadFiles = useCallback(() => {
    fetch(`/api/files?ticket_id=${id}`)
      .then((r) => r.json())
      .then((data) => setFiles(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [id]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    if (typeof dateStr === "string" && dateStr.includes("T")) {
      return dateStr.split("T")[0];
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  };

  const handleAssignOwner = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${ticket.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_to: selectedAssignee ? parseInt(selectedAssignee) : null,
          notes: assignNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to assign incident");
        return;
      }
      setShowAssignModal(false);
      setAssignNote("");
      fetchIncidentData();
    } catch {
      alert("Network error assigning incident");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/incidents/${ticket.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          notes: statusNote,
          temenos_status: temenosStatusInput || null,
          follow_up_date: followUpDateInput || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update status");
        return;
      }
      setShowStatusModal(false);
      setStatusNote("");
      fetchIncidentData();
    } catch {
      alert("Network error updating status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !ticket || ticket.error) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-gray-700 font-medium">Incident not found</p>
        <p className="text-sm text-gray-500 mt-1">{error || "The requested incident could not be found."}</p>
        <Link href="/incidents" className="text-sm mt-3 inline-block hover:underline text-green-800">
          ← Back to Incidents
        </Link>
      </div>
    );
  }

  const hasSummary = ticket.summary && ticket.summary.trim().length > 0;
  const directlyLinked = ticket.directly_linked_articles || [];
  const subgroupArticles = ticket.subgroup_articles || [];
  const groupArticles = ticket.group_articles || [];
  const similarIncidents = ticket.similar_incidents || [];
  const subgroupIncidents = ticket.subgroup_incidents || [];
  const history = ticket.history || [];

  const canAssign = hasPermission("incident.assign");
  const canEdit = hasPermission("incident.edit");

  return (
    <div className="max-w-5xl space-y-6">
      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/incidents" className="hover:underline text-green-800">
          Temenos Incidents
        </Link>
        <span>›</span>
        {ticket.group_code && (
          <>
            <Link href={`/groups/${ticket.group_code}`} className="hover:underline text-green-800">
              {ticket.group_name || ticket.group_code}
            </Link>
            <span>›</span>
          </>
        )}
        <span className="text-gray-900 font-mono font-semibold">{ticket.reference}</span>
      </div>

      {/* Incident Header & Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-xl font-bold text-gray-900">{ticket.reference}</span>
              <Badge variant="published">{ticket.status || "Open"}</Badge>
              {ticket.group_code && (
                <Link
                  href={`/groups/${ticket.group_code}`}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {ticket.group_name || ticket.group_code}
                </Link>
              )}
              {ticket.subgroup_name && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-800 border border-green-200">
                  {ticket.subgroup_name}
                </span>
              )}
            </div>
            {hasSummary && <p className="text-sm text-gray-700 leading-relaxed max-w-3xl">{ticket.summary}</p>}
          </div>

          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <Link
              href={`/incidents/${ticket.id}/edit`}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            >
              Edit Incident
            </Link>
            <Link
              href={`/knowledge/new?from_incident=${ticket.id}`}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white shadow-sm transition-colors"
              style={{ backgroundColor: "var(--primary)" }}
              title="Convert resolved incident into reusable knowledge article"
            >
              → Convert to Knowledge
            </Link>
            <Link
              href={`/escalations?source_incident_id=${ticket.id}`}
              className="px-3 py-1.5 text-xs font-medium border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-lg transition-colors"
            >
              ⚠ Escalate
            </Link>
          </div>
        </div>

        {/* Ownership & Temenos Tracking Strip */}
        <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 font-medium block mb-0.5">Internal Owner:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900">
                {ticket.assigned_to_name || ticket.internal_owner || "Unassigned"}
              </span>
              {canAssign && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="text-[10px] text-green-800 underline hover:font-bold"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="text-gray-400 font-medium block mb-0.5">Temenos Portal Status:</span>
            <span className="font-semibold text-gray-800">
              {ticket.temenos_status || "Not Registered in External Portal"}
            </span>
          </div>

          <div>
            <span className="text-gray-400 font-medium block mb-0.5">Follow-up / Deadline:</span>
            <span className="font-semibold text-gray-800">{formatDate(ticket.follow_up_date)}</span>
          </div>

          <div>
            <span className="text-gray-400 font-medium block mb-0.5">Workflow Status:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900">{ticket.status}</span>
              {canEdit && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="text-[10px] text-green-800 underline hover:font-bold"
                >
                  Update
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Investigation & Solution Body */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Technical Investigation & Solution
        </h2>

        {/* Problem / Symptoms */}
        <div>
          <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-1">Problem / Symptoms</h3>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-red-50/50 p-3 rounded-lg border border-red-100">
            {ticket.problem_symptoms || ticket.summary}
          </p>
        </div>

        {/* Root Cause */}
        {ticket.root_cause && (
          <div>
            <h3 className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">Root Cause Analysis</h3>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-orange-50/50 p-3 rounded-lg border border-orange-100">
              {ticket.root_cause}
            </p>
          </div>
        )}

        {/* Diagnostic Information */}
        {ticket.diagnostic_information && (
          <div>
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Diagnostic Commands & Output</h3>
            <div className="bg-gray-950 text-green-400 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto border border-gray-800">
              {ticket.diagnostic_information}
            </div>
          </div>
        )}

        {/* Solution / Fix */}
        {(ticket.immediate_fix || ticket.permanent_fix) && (
          <div>
            <h3 className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Applied Solution / Workaround</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {ticket.immediate_fix || ticket.permanent_fix}
            </div>
          </div>
        )}

        {/* Verification */}
        {ticket.verification && (
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Verification Steps</h3>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-1">
              {ticket.verification.split("\n").filter(Boolean).map((line: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-800 py-0.5">
                  <span className="text-green-700 font-bold">✓</span>
                  <span>{line.replace(/^[✓☐\-\*\d\.]+\s*/, "")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Two-column layout: Left (History, Related KB), Right (Metadata, Similar Incidents) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Assignment History Timeline */}
          {history.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Status & Assignment History Timeline
              </h3>
              <div className="space-y-3 pl-2 border-l-2 border-green-700 ml-2">
                {history.map((h: any) => (
                  <div key={h.id} className="relative pl-4 text-xs">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-green-700" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800">
                        {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    {h.notes && <p className="text-gray-600 mt-0.5">{h.notes}</p>}
                    <p className="text-[10px] text-gray-400">By {h.changed_by_name || "System"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Knowledge Articles */}
          {directlyLinked.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Directly Linked Knowledge Base Solutions ({directlyLinked.length})
              </h3>
              <div className="space-y-2">
                {directlyLinked.map((article: any) => (
                  <Link
                    key={article.id}
                    href={`/knowledge/${article.id}`}
                    className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{article.title}</p>
                      {article.symptoms && (
                        <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-1">{article.symptoms}</p>
                      )}
                    </div>
                    <span className="text-green-800 font-medium">Read KB →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              File Attachments & Evidence
            </h3>
            <FileUpload ticketId={ticket.id} files={files} onFilesChanged={loadFiles} />
          </div>
        </div>

        {/* Right column: Incident Metadata & Similar Incidents */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-gray-900 uppercase tracking-wider">Incident Metadata</h3>
            <div className="divide-y divide-gray-100">
              <div className="py-2 flex justify-between">
                <span className="text-gray-400">Priority:</span>
                <span className="font-medium text-gray-800">{ticket.priority || "Medium"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-gray-400">Severity:</span>
                <span className="font-medium text-gray-800">{ticket.severity || "Severity 3"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-gray-400">Requester:</span>
                <span className="font-medium text-gray-800">{ticket.requester || "Internal"}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-gray-400">Reported Date:</span>
                <span className="font-medium text-gray-800">{formatDate(ticket.created_at_ticket || ticket.created_at)}</span>
              </div>
              {ticket.resolved_at && (
                <div className="py-2 flex justify-between">
                  <span className="text-gray-400">Resolved Date:</span>
                  <span className="font-medium text-green-800 font-semibold">{formatDate(ticket.resolved_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Similar Incidents */}
          {similarIncidents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Similar Historical Incidents</h3>
              <div className="space-y-2">
                {similarIncidents.map((sim: any) => (
                  <Link
                    key={sim.id}
                    href={`/incidents/${sim.id}`}
                    className="p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 block text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-green-800">{sim.reference}</span>
                      {sim.priority && <Badge variant={sim.priority.toLowerCase()}>{sim.priority}</Badge>}
                    </div>
                    <p className="text-gray-600 line-clamp-1 mt-1">{sim.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign Owner Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Assign Internal Owner</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Select Core Systems Engineer</label>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assignment Note / Handover Remark</label>
              <textarea
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="Details about assigned responsibility..."
                rows={3}
                className="w-full text-xs border border-gray-300 rounded-lg p-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignOwner}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {actionLoading ? "Saving..." : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Update Incident Lifecycle Status</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white"
              >
                <option value="new">New / Logged</option>
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">Official Temenos Status</label>
              <input
                type="text"
                value={temenosStatusInput}
                onChange={(e) => setTemenosStatusInput(e.target.value)}
                placeholder="e.g. Under Analysis, Waiting for Client, Delivered in Patch"
                className="w-full text-xs border border-gray-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={followUpDateInput}
                onChange={(e) => setFollowUpDateInput(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Update Notes (Investigation / Reason)</label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Details of investigation or actions taken..."
                rows={3}
                className="w-full text-xs border border-gray-300 rounded-lg p-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg text-white"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {actionLoading ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
