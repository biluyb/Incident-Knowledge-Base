// ============================================================
// Role-Based Access Control — Permission Matrix
// Core Systems Hub — Tsehay Bank
// ============================================================
//
// Roles: ADMIN, TEAM_LEAD, KNOWLEDGE_MANAGER, CONTRIBUTOR, VIEWER
//
// ============================================================

export type Role = 'admin' | 'team_lead' | 'knowledge_manager' | 'contributor' | 'viewer';

export type Permission =
  // Incidents
  | 'incident.view'
  | 'incident.create'
  | 'incident.edit'
  | 'incident.delete'
  | 'incident.assign'
  | 'incident.escalate'
  // Knowledge
  | 'knowledge.view'
  | 'knowledge.create'
  | 'knowledge.edit'
  | 'knowledge.delete'
  | 'knowledge.approve'
  // Groups & Subtypes
  | 'group.view'
  | 'group.create'
  | 'group.edit'
  | 'group.delete'
  | 'subtype.view'
  | 'subtype.create'
  | 'subtype.edit'
  | 'subtype.delete'
  // Projects
  | 'project.view'
  | 'project.create'
  | 'project.edit'
  | 'project.delete'
  | 'project.manage_members'
  // Tasks
  | 'task.view'
  | 'task.create'
  | 'task.edit'
  | 'task.delete'
  | 'task.assign'
  // Daily Reports
  | 'daily_report.view'
  | 'daily_report.submit'
  | 'daily_report.review'
  | 'daily_report.export'
  // Escalations
  | 'escalation.view'
  | 'escalation.create'
  | 'escalation.manage'
  | 'escalation.resolve'
  // Files
  | 'file.view'
  | 'file.upload'
  | 'file.delete'
  // Comments
  | 'comment.view'
  | 'comment.create'
  | 'comment.edit_own'
  | 'comment.delete_own'
  | 'comment.delete_any'
  // Users & Teams
  | 'user.view'
  | 'user.manage'
  | 'user.change_role'
  | 'team.manage'
  // Audit & Analytics
  | 'audit.view'
  | 'analytics.view'
  // Search
  | 'search';

// ============================================================
// Permission Matrix
// ============================================================

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // All permissions
    'incident.view', 'incident.create', 'incident.edit', 'incident.delete', 'incident.assign', 'incident.escalate',
    'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.delete', 'knowledge.approve',
    'group.view', 'group.create', 'group.edit', 'group.delete',
    'subtype.view', 'subtype.create', 'subtype.edit', 'subtype.delete',
    'project.view', 'project.create', 'project.edit', 'project.delete', 'project.manage_members',
    'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign',
    'daily_report.view', 'daily_report.submit', 'daily_report.review', 'daily_report.export',
    'escalation.view', 'escalation.create', 'escalation.manage', 'escalation.resolve',
    'file.view', 'file.upload', 'file.delete',
    'comment.view', 'comment.create', 'comment.edit_own', 'comment.delete_own', 'comment.delete_any',
    'user.view', 'user.manage', 'user.change_role', 'team.manage',
    'audit.view', 'analytics.view',
    'search',
  ],
  team_lead: [
    'incident.view', 'incident.create', 'incident.edit', 'incident.delete', 'incident.assign', 'incident.escalate',
    'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.approve',
    'group.view', 'group.create', 'group.edit',
    'subtype.view', 'subtype.create', 'subtype.edit',
    'project.view', 'project.create', 'project.edit', 'project.manage_members',
    'task.view', 'task.create', 'task.edit', 'task.delete', 'task.assign',
    'daily_report.view', 'daily_report.submit', 'daily_report.review', 'daily_report.export',
    'escalation.view', 'escalation.create', 'escalation.manage', 'escalation.resolve',
    'file.view', 'file.upload', 'file.delete',
    'comment.view', 'comment.create', 'comment.edit_own', 'comment.delete_own', 'comment.delete_any',
    'user.view',
    'audit.view', 'analytics.view',
    'search',
  ],
  knowledge_manager: [
    'incident.view', 'incident.create', 'incident.edit', 'incident.escalate',
    'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.delete', 'knowledge.approve',
    'group.view', 'group.create', 'group.edit',
    'subtype.view', 'subtype.create', 'subtype.edit',
    'project.view',
    'task.view',
    'daily_report.view', 'daily_report.submit',
    'escalation.view', 'escalation.create',
    'file.view', 'file.upload', 'file.delete',
    'comment.view', 'comment.create', 'comment.edit_own', 'comment.delete_own', 'comment.delete_any',
    'analytics.view',
    'search',
  ],
  contributor: [
    'incident.view', 'incident.create', 'incident.edit', 'incident.escalate',
    'knowledge.view', 'knowledge.create', 'knowledge.edit',
    'group.view',
    'subtype.view',
    'project.view',
    'task.view', 'task.create', 'task.edit',
    'daily_report.view', 'daily_report.submit',
    'escalation.view', 'escalation.create',
    'file.view', 'file.upload', 'file.delete',
    'comment.view', 'comment.create', 'comment.edit_own', 'comment.delete_own',
    'search',
  ],
  viewer: [
    'incident.view',
    'knowledge.view',
    'group.view',
    'subtype.view',
    'project.view',
    'task.view',
    'escalation.view',
    'file.view',
    'comment.view',
    'search',
  ],
};

// ============================================================
// Permission Checking
// ============================================================

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function userHasPermission(user: { role: string } | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return hasPermission(user.role as Role, permission);
}

export function canAccessOwnResource(role: Role, permission: Permission): boolean {
  const ownResourcePermissions: Permission[] = [
    'comment.edit_own', 'comment.delete_own',
    'file.delete',
  ];
  if (ownResourcePermissions.includes(permission)) {
    return hasPermission(role, permission);
  }
  return false;
}

// ============================================================
// Role Helpers
// ============================================================

export function isValidRole(role: string): role is Role {
  return ['admin', 'team_lead', 'knowledge_manager', 'contributor', 'viewer'].includes(role);
}

export function getRoleHierarchy(): Record<Role, number> {
  return {
    admin: 5,
    team_lead: 4,
    knowledge_manager: 3,
    contributor: 2,
    viewer: 1,
  };
}

export function isRoleHigherOrEqual(role: Role, requiredRole: Role): boolean {
  const hierarchy = getRoleHierarchy();
  return (hierarchy[role] || 0) >= (hierarchy[requiredRole] || 0);
}

/**
 * Prevent removing the last admin.
 */
export async function canRemoveAdmin(targetUserId: number, currentUserId: number): Promise<boolean> {
  const { queryOne } = await import('./db');
  
  const target = await queryOne<{ role: string }>(
    'SELECT role FROM users WHERE id = $1',
    [targetUserId]
  );
  
  if (!target || target.role !== 'admin') return true;
  
  const adminCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*)::text as count FROM users WHERE role = 'admin' AND status = 'active'"
  );
  
  if (adminCount && parseInt(adminCount.count) <= 1) {
    if (targetUserId === currentUserId) return false;
    return false;
  }
  
  return true;
}
