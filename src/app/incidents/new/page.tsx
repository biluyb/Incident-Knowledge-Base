"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Group {
  id: number;
  code: string;
  name: string;
}

// Group-specific dynamic fields per instruction §12
const GROUP_FIELDS: Record<string, { label: string; placeholder: string }[]> = {
  "COB-BATCH": [
    { label: "COB Process / Stage", placeholder: "e.g. Start of Day, End of Day, AA.CREATE.NAU.ACTIVITIES" },
    { label: "Batch / Job Name", placeholder: "e.g. AA.SERVICE.PROCESS, EOD.RE.CONSOL.PRINT" },
    { label: "Affected Service", placeholder: "e.g. AA, EB, RE" },
    { label: "T24 Routine", placeholder: "e.g. AA.CREATE.NAU.ACTIVITIES" },
    { label: "Error Message", placeholder: "e.g. FATAL ERROR, COB crashed, COB stalled" },
  ],
  "ACCT-LIFECYCLE": [
    { label: "Account / Arrangement Type", placeholder: "e.g. OD Account, Savings, Term Deposit" },
    { label: "Product Code", placeholder: "e.g. CHAMPION.SAVING.ACCOUNT" },
    { label: "Operation", placeholder: "e.g. Closure, Activation, Status Change" },
    { label: "Error / Block", placeholder: "e.g. Dues Not Settled, Arrangement Status Invalid" },
  ],
  "INTEREST-LOANS": [
    { label: "Interest Type", placeholder: "e.g. Accrual, Capitalization, Reversal" },
    { label: "Product / Arrangement", placeholder: "e.g. Fixed Deposit, Loan, Savings" },
    { label: "Accounting Issue", placeholder: "e.g. PL category mismatch, ECB mismatch" },
    { label: "T24 Record", placeholder: "e.g. AA.SCHEDULED.ACTIVITY, AA.BILL.DETAILS" },
  ],
  "PAYMENTS-FX": [
    { label: "Payment Type", placeholder: "e.g. FT, FX, MT103" },
    { label: "Transaction Type", placeholder: "e.g. Inward, Outward, Reversal" },
    { label: "Currency", placeholder: "e.g. ETB, USD" },
    { label: "GL Account / Category", placeholder: "e.g. PL category, Tax account" },
    { label: "Posting Issue", placeholder: "e.g. Entries not raised, Amount mismatch" },
  ],
  "TELLER-BRANCH": [
    { label: "Teller / Vault", placeholder: "e.g. TELLER.ID, Vault account" },
    { label: "Transaction Type", placeholder: "e.g. Cash deposit, Cheque clearing, Reversal" },
    { label: "Branch", placeholder: "e.g. Branch name or code" },
    { label: "Operation", placeholder: "e.g. Cancellation, Sweep, Block" },
  ],
  "COMPLIANCE": [
    { label: "Screening Type", placeholder: "e.g. FCM, AML, Private Watch List" },
    { label: "FCM Module", placeholder: "e.g. FCM Profiling, Batch Screening" },
    { label: "AML Rule", placeholder: "e.g. Watch List Match, Sanctions" },
    { label: "Screening Result", placeholder: "e.g. False Positive, True Match" },
  ],
  "SYS-ADMIN": [
    { label: "Platform Component", placeholder: "e.g. Docker, Atlas, tRun, Browser" },
    { label: "Configuration", placeholder: "e.g. Product setup, Company definition" },
    { label: "Service", placeholder: "e.g. ONLINE.SERVICE, Batch service" },
    { label: "Issue Type", placeholder: "e.g. Build failure, Performance, Schema" },
  ],
};

export default function AddIncidentPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    reference: "",
    summary: "",
    group_id: "",
    priority: "",
    severity: "",
    status: "Permanently Closed",
    root_cause_category: "",
    requester: "",
  });

  // Dynamic group-specific fields
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then(setGroups)
      .catch(console.error);
  }, []);

  const selectedGroup = groups.find((g) => String(g.id) === form.group_id);
  const groupFields = selectedGroup ? GROUP_FIELDS[selectedGroup.code] || [] : [];

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dynamic_fields: dynamicFields,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      router.push(`/incidents/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/incidents" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Incidents
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Incident</h1>
        <p className="text-sm text-gray-500 mt-1">
          Document a solved historical incident for future reference
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Incident Fields — instruction §10 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Incident Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reference Number *</label>
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
              <label className="block text-xs text-gray-500 mb-1">Summary *</label>
              <input
                type="text"
                value={form.summary}
                onChange={(e) => update("summary", e.target.value)}
                placeholder="Brief description of the incident"
                required
                className={fieldClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Group *</label>
              <select
                value={form.group_id}
                onChange={(e) => {
                  update("group_id", e.target.value);
                  setDynamicFields({});
                }}
                required
                className={fieldClass}
              >
                <option value="">Select domain...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => update("priority", e.target.value)}
                className={fieldClass}
              >
                <option value="">Select...</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => update("severity", e.target.value)}
                className={fieldClass}
              >
                <option value="">Select...</option>
                <option value="Severity 1">Severity 1</option>
                <option value="Severity 2">Severity 2</option>
                <option value="Severity 3">Severity 3</option>
                <option value="Severity 4">Severity 4</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Root Cause Category</label>
              <input
                type="text"
                value={form.root_cause_category}
                onChange={(e) => update("root_cause_category", e.target.value)}
                placeholder="e.g. Data Input Error, Configuration Issue"
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Requester / Engineer</label>
              <input
                type="text"
                value={form.requester}
                onChange={(e) => update("requester", e.target.value)}
                placeholder="e.g. samuelku"
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Group-Specific Fields — instruction §12 */}
        {groupFields.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              {selectedGroup?.name} — Specific Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupFields.map((f) => (
                <div key={f.label}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={dynamicFields[f.label] || ""}
                    onChange={(e) =>
                      setDynamicFields((prev) => ({ ...prev, [f.label]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    className={fieldClass}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/incidents"
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !form.reference || !form.summary || !form.group_id}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Incident"}
          </button>
        </div>
      </form>
    </div>
  );
}
