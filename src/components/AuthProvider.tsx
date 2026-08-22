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
  admin: 4,
  knowledge_manager: 3,
  contributor: 2,
  viewer: 1,
};

// Permission matrix
const PERMISSIONS: Record<string, string[]> = {
  admin: [
    "incident.view", "incident.create", "incident.edit", "incident.delete",
    "knowledge.view", "knowledge.create", "knowledge.edit", "knowledge.delete",
    "group.view", "group.create", "group.edit", "group.delete",
    "subtype.view", "subtype.create", "subtype.edit", "subtype.delete",
    "file.view", "file.upload", "file.delete",
    "comment.view", "comment.create", "comment.edit_own", "comment.delete_own", "comment.delete_any",
    "user.view", "user.manage", "user.change_role",
    "audit.view", "search",
  ],
  knowledge_manager: [
    "incident.view", "incident.create", "incident.edit", "incident.delete",
    "knowledge.view", "knowledge.create", "knowledge.edit", "knowledge.delete",
    "group.view", "group.create", "group.edit",
    "subtype.view", "subtype.create", "subtype.edit",
    "file.view", "file.upload", "file.delete",
    "comment.view", "comment.create", "comment.edit_own", "comment.delete_own", "comment.delete_any",
    "audit.view", "search",
  ],
  contributor: [
    "incident.view", "incident.create", "incident.edit",
    "knowledge.view", "knowledge.create", "knowledge.edit",
    "group.view", "subtype.view",
    "file.view", "file.upload", "file.delete",
    "comment.view", "comment.create", "comment.edit_own", "comment.delete_own",
    "search",
  ],
  viewer: [
    "incident.view", "knowledge.view", "group.view", "subtype.view",
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
        return { success: false, error: data.error };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  const hasRole = (role: string) => {
    if (!user) return false;
    return user.role === role;
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    const rolePerms = PERMISSIONS[user.role] || [];
    return rolePerms.includes(permission);
  };

  const roleLevel = user ? ROLE_HIERARCHY[user.role] || 0 : 0;

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    refresh: fetchUser,
    hasRole,
    hasPermission,
    isAdmin: roleLevel >= 4,
    isKnowledgeManager: roleLevel >= 3,
    isContributor: roleLevel >= 2,
    isViewer: roleLevel >= 1,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
