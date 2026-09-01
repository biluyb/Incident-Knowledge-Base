"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface Profile {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  knowledge_manager: "Knowledge Manager",
  contributor: "Contributor",
  viewer: "Viewer",
};

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (data.user) {
        setProfile(data.user);
        setEditName(data.user.name);
        setEditEmail(data.user.email);
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleNameChange = (value: string) => {
    setEditName(value);
    setIsDirty(value !== (profile?.name || "") || editEmail !== (profile?.email || ""));
  };

  const handleEmailChange = (value: string) => {
    setEditEmail(value);
    setIsDirty(editName !== (profile?.name || "") || value !== (profile?.email || ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editName.trim()) {
      setError("Name is required");
      return;
    }

    if (!editEmail.trim()) {
      setError("Email is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update profile");
        return;
      }

      // Update local profile state
      setProfile(data.user);
      setEditName(data.user.name);
      setEditEmail(data.user.email);
      setIsDirty(false);
      setSuccess("Profile updated successfully");

      // Refresh AuthProvider to reflect changes in Navigation
      await refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Please sign in to view your profile.</p>
        <Link
          href="/login"
          className="text-sm mt-2 inline-block"
          style={{ color: "var(--primary)" }}
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 bg-gray-100 rounded w-48 animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and update your account information.
        </p>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-600">
            {profile?.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {profile?.name}
            </h2>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {ROLE_LABELS[profile?.role || ""] || profile?.role}
            </span>
          </div>
        </div>

        {/* Account Details (read-only) */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-sm">
          <div>
            <p className="text-gray-500">Account Status</p>
            <p className="font-medium text-gray-900 capitalize">
              {profile?.status || "Active"}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Role</p>
            <p className="font-medium text-gray-900">
              {ROLE_LABELS[profile?.role || ""] || profile?.role}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Member Since</p>
            <p className="font-medium text-gray-900">
              {formatDate(profile?.created_at || null)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Last Login</p>
            <p className="font-medium text-gray-900">
              {formatDate(profile?.last_login || null)}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Edit Profile
        </h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              maxLength={200}
              required
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {isDirty && (
              <button
                type="button"
                onClick={() => {
                  setEditName(profile?.name || "");
                  setEditEmail(profile?.email || "");
                  setIsDirty(false);
                  setError("");
                  setSuccess("");
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Change Password
        </h3>

        {passwordError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-4">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 mb-4">
            {passwordSuccess}
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPasswordError("");
            setPasswordSuccess("");

            if (!currentPassword) {
              setPasswordError("Current password is required");
              return;
            }

            if (!newPassword) {
              setPasswordError("New password is required");
              return;
            }

            if (newPassword.length < 8) {
              setPasswordError("New password must be at least 8 characters");
              return;
            }

            if (newPassword !== confirmPassword) {
              setPasswordError("New passwords do not match");
              return;
            }

            setChangingPassword(true);
            try {
              const res = await fetch("/api/auth/profile/password", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
              });

              const data = await res.json();
              if (!res.ok) {
                setPasswordError(data.error || "Failed to change password");
                return;
              }

              setPasswordSuccess("Password updated successfully");
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            } catch {
              setPasswordError("Network error. Please try again.");
            } finally {
              setChangingPassword(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              autoComplete="current-password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Back to Dashboard */}
      <div>
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
