"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isTeamLead: boolean;
  isKnowledgeManager: boolean;
  isContributor: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 5,
  team_lead: 4,
  knowledge_manager: 3,
  contributor: 2,
  viewer: 1,
};

// Permission matrix
const PERMISSIONS: Record<string, string[]> = {
  admin: [
    "incident.view", "incident.create", "incident.edit", "incident.delete", "incident.assign", "incident.escalate",
    "knowledge.view", "knowledge.create", "knowledge.edit", "knowledge.delete", "knowledge.approve",
    "group.view", "group.create", "group.edit", "group.delete",
    "subtype.view", "subtype.create", "subtype.edit", "subtype.delete",
    "project.view", "project.create", "project.edit", "project.delete", "project.manage_members",
    "task.view", "task.create", "task.edit", "task.delete", "task.assign",
    "daily_report.view", "daily_report.submit", "daily_report.review", "daily_report.export",
    "escalation.view", "escalation.create", "escalation.manage", "escalation.resolve",
    "file.view", "file.upload", "file.delete",
    "comment.view", "comment.create", "comment.edit_own", "comment.delete_own", "comment.delete_any",
    "user.view", "user.manage", "user.change_role", "team.manage",
    "audit.view", "analytics.view", "search",
  ],
  team_lead: [
    "incident.view", "incident.create", "incident.edit", "incident.delete", "incident.assign", "incident.escalate",
    "knowledge.view", "knowledge.create", "knowledge.edit", "knowledge.approve",
    "group.view", "group.create", "group.edit",
    "subtype.view", "subtype.create", "subtype.edit",
    "project.view", "project.create", "project.edit", "project.manage_members",
    "task.view", "task.create", "task.edit", "task.delete", "task.assign",
    "daily_report.view", "daily_report.submit", "daily_report.review", "daily_report.export",
    "escalation.view", "escalation.create", "escalation.manage", "escalation.resolve",
    "file.view", "file.upload", "file.delete",
    "comment.view", "comment.create", "comment.edit_own", "comment.delete_own", "comment.delete_any",
    "user.view", "audit.view", "analytics.view", "search",
  ],
  knowledge_manager: [
    "incident.view", "incident.create", "incident.edit", "incident.escalate",
    "knowledge.view", "knowledge.create", "knowledge.edit", "knowledge.delete", "knowledge.approve",
    "group.view", "group.create", "group.edit",
    "subtype.view", "subtype.create", "subtype.edit",
    "project.view", "task.view",
    "daily_report.view", "daily_report.submit",
    "escalation.view", "escalation.create",
    "file.view", "file.upload", "file.delete",
    "comment.view", "comment.create", "comment.edit_own", "comment.delete_own", "comment.delete_any",
    "analytics.view", "search",
  ],
  contributor: [
    "incident.view", "incident.create", "incident.edit", "incident.escalate",
    "knowledge.view", "knowledge.create", "knowledge.edit",
    "group.view", "subtype.view",
    "project.view", "task.view", "task.create", "task.edit",
    "daily_report.view", "daily_report.submit",
    "escalation.view", "escalation.create",
    "file.view", "file.upload", "file.delete",
    "comment.view", "comment.create", "comment.edit_own", "comment.delete_own",
    "search",
  ],
  viewer: [
    "incident.view", "knowledge.view", "group.view", "subtype.view",
    "project.view", "task.view", "escalation.view",
    "file.view", "comment.view", "search",
  ],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
    }
  };

  const refresh = async () => {
    await fetchUser();
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    const userRoleHierarchy = ROLE_HIERARCHY[user.role] || 0;
    const requiredRoleHierarchy = ROLE_HIERARCHY[role] || 0;
    return userRoleHierarchy >= requiredRoleHierarchy;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const userPermissions = PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refresh,
        hasRole,
        hasPermission,
        isAdmin: user?.role === "admin",
        isTeamLead: user?.role === "team_lead",
        isKnowledgeManager: user?.role === "knowledge_manager",
        isContributor: user?.role === "contributor",
        isViewer: user?.role === "viewer",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
