// ============================================================
// Role-Based Access Control — Permission Matrix
// ============================================================
//
// Roles: ADMIN, KNOWLEDGE_MANAGER, CONTRIBUTOR, VIEWER
//
// This file defines:
// 1. Role hierarchy and permissions
// 2. Permission checking functions
// 3. Resource ownership checks
// ============================================================

export type Role = 'admin' | 'knowledge_manager' | 'contributor' | 'viewer';

export type Permission =
  // Incidents
  | 'incident.view'
  | 'incident.create'
  | 'incident.edit'
  | 'incident.delete'
  // Knowledge
  | 'knowledge.view'
  | 'knowledge.create'
  | 'knowledge.edit'
  | 'knowledge.delete'
  // Groups
  | 'group.view'
  | 'group.create'
  | 'group.edit'
  | 'group.delete'
  // Subgroups
  | 'subtype.view'
  | 'subtype.create'
  | 'subtype.edit'
  | 'subtype.delete'
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
  // Users
  | 'user.view'
  | 'user.manage'
  | 'user.change_role'
  // Audit
  | 'audit.view'
  // Search
  | 'search';

// ============================================================
// Permission Matrix
// ============================================================
// Action                        ADMIN  KM  CONTRIBUTOR  VIEWER
// ─────────────────────────────────────────────────────────────
// View incidents                 YES   YES    YES        YES
// Create incident                YES   YES    YES        NO
// Edit incident                  YES   YES    YES        NO
// Delete incident                YES   YES    NO         NO
//
// View knowledge                 YES   YES    YES        YES
// Create knowledge               YES   YES    YES        NO
// Edit knowledge                 YES   YES    YES        NO
// Delete knowledge               YES   YES    NO         NO
//
// Create group                   YES   YES*   NO         NO
// Edit group                     YES   YES*   NO         NO
// Delete group                   YES   NO     NO         NO
//
// Create subgroup                YES   YES*   NO         NO
// Edit subgroup                  YES   YES*   NO         NO
// Delete subgroup                YES   NO     NO         NO
//
// Upload attachment              YES   YES    YES        NO
// Delete attachment              YES   YES    OWN        NO
//
// Add comment                    YES   YES    YES        NO
// Edit own comment               YES   YES    YES        NO
// Delete own comment             YES   YES    OWN        NO
// Delete any comment             YES   YES    NO         NO
//
// Manage users                   YES   NO     NO         NO
// Change roles                   YES   NO     NO         NO
// View audit logs                YES   YES*   NO         NO
//
// * subject to final business rules

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // All permissions
    'incident.view', 'incident.create', 'incident.edit', 'incident.delete',
    'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.delete',
    'group.view', 'group.create', 'group.edit', 'group.delete',
    'subtype.view', 'subtype.create', 'subtype.edit', 'subtype.delete',
    'file.view', 'file.upload', 'file.delete',
    'comment.view', 'comment.create', 'comment.edit_own', 'comment.delete_own', 'comment.delete_any',
    'user.view', 'user.manage', 'user.change_role',
    'audit.view',
    'search',
  ],
  knowledge_manager: [
    'incident.view', 'incident.create', 'incident.edit', 'incident.delete',
    'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.delete',
    'group.view', 'group.create', 'group.edit',
    'subtype.view', 'subtype.create', 'subtype.edit',
    'file.view', 'file.upload', 'file.delete',
    'comment.view', 'comment.create', 'comment.edit_own', 'comment.delete_own', 'comment.delete_any',
    'audit.view',
    'search',
  ],
  contributor: [
    'incident.view', 'incident.create', 'incident.edit',
    'knowledge.view', 'knowledge.create', 'knowledge.edit',
    'group.view',
    'subtype.view',
    'file.view', 'file.upload', 'file.delete',
    'comment.view', 'comment.create', 'comment.edit_own', 'comment.delete_own',
    'search',
  ],
  viewer: [
    'incident.view',
    'knowledge.view',
    'group.view',
    'subtype.view',
    'file.view',
    'comment.view',
    'search',
  ],
};

// ============================================================
// Permission Checking
// ============================================================

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * Check if a user has a specific permission.
 * Returns false if user is null/undefined.
 */
export function userHasPermission(user: { role: string } | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return hasPermission(user.role as Role, permission);
}

/**
 * Check if a role can perform an action on a resource they own.
 * For contributor-level: can edit/delete own resources.
 */
export function canAccessOwnResource(role: Role, permission: Permission): boolean {
  // For own resources, contributors can edit/delete their own
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
  return ['admin', 'knowledge_manager', 'contributor', 'viewer'].includes(role);
}

export function getRoleHierarchy(): Record<Role, number> {
  return {
    admin: 4,
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
  
  // Get target user's role
  const target = await queryOne<{ role: string }>(
    'SELECT role FROM users WHERE id = $1',
    [targetUserId]
  );
  
  if (!target || target.role !== 'admin') return true;
  
  // Count admins
  const adminCount = await queryOne<{ count: string }>(
    "SELECT COUNT(*)::text as count FROM users WHERE role = 'admin' AND status = 'active'"
  );
  
  // If only one admin, and it's the target, prevent removal
  if (adminCount && parseInt(adminCount.count) <= 1) {
    // Allow if it's a self-role-change (admin changing own role)
    if (targetUserId === currentUserId) return false;
    return false;
  }
  
  return true;
}
