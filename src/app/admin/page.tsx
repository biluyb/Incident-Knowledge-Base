"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Group {
  id: number;
  code: string;
  name: string;
  description: string | null;
  ticket_count: number;
  subgroup_count: number;
}

interface Subgroup {
  id: number;
  code: string;
  name: string;
  group_id: number;
  group_code: string;
  group_name: string;
  ticket_count: number;
}

export default function AdminPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewSubgroup, setShowNewSubgroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editingSubgroup, setEditingSubgroup] = useState<Subgroup | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/groups").then((r) => r.json()),
      fetch("/api/admin/subgroups").then((r) => r.json()),
    ])
      .then(([groupsData, subgroupsData]) => {
        setGroups(groupsData);
        setSubgroups(subgroupsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleDeleteGroup = async (id: number, name: string) => {
    if (!confirm(`Delete group "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/groups/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to delete group");
      return;
    }
    loadData();
  };

  const handleDeleteSubgroup = async (id: number, name: string) => {
    if (!confirm(`Delete subgroup "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/subgroups/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to delete subgroup");
      return;
    }
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-gray-500 mt-1">Manage groups, subgroups, and system settings.</p>
        </div>
      </div>

      {/* Groups Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Groups ({groups.length})</h2>
          <button onClick={() => setShowNewGroup(true)} className="btn-primary text-xs">
            + Add Group
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {groups.map((g) => (
              <div key={g.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-500">{g.code}</span>
                    <span className="text-sm font-medium text-gray-900">{g.name}</span>
                  </div>
                  {g.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{g.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{g.ticket_count} incidents</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{g.subgroup_count} subgroups</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingGroup(g)}
                    className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(g.id, g.name)}
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subgroups Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Subgroups ({subgroups.length})</h2>
          <button onClick={() => setShowNewSubgroup(true)} className="btn-primary text-xs">
            + Add Subgroup
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {subgroups.map((sg) => (
              <div key={sg.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-500">{sg.code}</span>
                    <span className="text-sm font-medium text-gray-900">{sg.name}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    in {sg.group_name || sg.group_code}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{sg.ticket_count} incidents</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingSubgroup(sg)}
                    className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSubgroup(sg.id, sg.name)}
                    className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Group Modal */}
      {showNewGroup && (
        <GroupModal
          onClose={() => setShowNewGroup(false)}
          onSaved={() => { setShowNewGroup(false); loadData(); }}
        />
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <GroupModal
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={() => { setEditingGroup(null); loadData(); }}
        />
      )}

      {/* New Subgroup Modal */}
      {showNewSubgroup && (
        <SubgroupModal
          groups={groups}
          onClose={() => setShowNewSubgroup(false)}
          onSaved={() => { setShowNewSubgroup(false); loadData(); }}
        />
      )}

      {/* Edit Subgroup Modal */}
      {editingSubgroup && (
        <SubgroupModal
          subgroup={editingSubgroup}
          groups={groups}
          onClose={() => setEditingSubgroup(null)}
          onSaved={() => { setEditingSubgroup(null); loadData(); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   Group Modal (Create / Edit)
   ============================================================ */
function GroupModal({
  group,
  onClose,
  onSaved,
}: {
  group?: Group;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    code: group?.code || "",
    name: group?.name || "",
    description: group?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = group ? `/api/admin/groups/${group.id}` : "/api/admin/groups";
    const method = group ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save group");
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            {group ? "Edit Group" : "New Group"}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. PAYMENTS-DIGITAL"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Payments & Digital Channels"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? "Saving..." : group ? "Save Changes" : "Create Group"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   Subgroup Modal (Create / Edit)
   ============================================================ */
function SubgroupModal({
  subgroup,
  groups,
  onClose,
  onSaved,
}: {
  subgroup?: Subgroup;
  groups: Group[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    code: subgroup?.code || "",
    name: subgroup?.name || "",
    description: "",
    group_id: subgroup?.group_id || groups[0]?.id || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const url = subgroup ? `/api/admin/subgroups/${subgroup.id}` : "/api/admin/subgroups";
    const method = subgroup ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save subgroup");
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            {subgroup ? "Edit Subgroup" : "New Subgroup"}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Group *</label>
            <select
              value={form.group_id}
              onChange={(e) => setForm({ ...form, group_id: parseInt(e.target.value) })}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. ST-G01-01"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Funds Transfer Failures"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? "Saving..." : subgroup ? "Save Changes" : "Create Subgroup"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
