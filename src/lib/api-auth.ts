import { NextRequest, NextResponse } from 'next/server';
import { verifySession, getCurrentUser } from './auth';
import { hasPermission, userHasPermission, type Permission, type Role } from './permissions';
import { queryOne } from './db';
import type { SessionPayload } from './auth';

// ============================================================
// API Authorization Helpers
// ============================================================

/**
 * Get the authenticated user from the request.
 * Returns null if not authenticated.
 */
export async function getAuthUser(request: NextRequest): Promise<SessionPayload | null> {
  // Try cookie-based session first
  const cookieToken = request.cookies.get('kb-session')?.value;
  if (cookieToken) {
    const session = await verifySession(cookieToken);
    if (session) return session;
  }

  // Try Authorization header (for API clients)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = await verifySession(token);
    if (session) return session;
  }

  return null;
}

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export async function requireAuth(request: NextRequest): Promise<
  { user: SessionPayload; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getAuthUser(request);
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }
  return { user };
}

/**
 * Require a specific permission. Returns 401 or 403 if not authorized.
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<
  { user: SessionPayload; error?: never } | { user?: never; error: NextResponse }
> {
  const auth = await requireAuth(request);
  if (auth.error) return auth;

  if (!hasPermission(auth.user.role as Role, permission)) {
    return {
      error: NextResponse.json(
        { error: 'Insufficient permissions', required: permission },
        { status: 403 }
      ),
    };
  }

  return { user: auth.user };
}

/**
 * Require admin role. Returns 403 if not admin.
 */
export async function requireAdmin(request: NextRequest): Promise<
  { user: SessionPayload; error?: never } | { user?: never; error: NextResponse }
> {
  return requirePermission(request, 'user.manage');
}

// ============================================================
// Audit Logging
// ============================================================

export interface AuditLogEntry {
  userId: number;
  action: string;
  entityType: string;
  entityId?: number | string;
  details?: string;
  result?: 'success' | 'failure';
}

/**
 * Log an audit event.
 * Fire-and-forget — does not throw on error.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await queryOne(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        entry.userId,
        entry.action,
        entry.entityType,
        entry.entityId ? String(entry.entityId) : null,
        entry.details || null,
      ]
    );
  } catch (err) {
    // Audit logging should never fail the request
    console.error('Audit log error:', err);
  }
}

// ============================================================
// Input Validation Helpers
// ============================================================

/**
 * Validate string input length and content.
 */
export function validateString(value: unknown, fieldName: string, maxLength: number = 500): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less`;
  }
  return null; // valid
}

/**
 * Validate required string input.
 */
export function validateRequired(value: unknown, fieldName: string, maxLength: number = 500): string | null {
  if (!value || typeof value !== 'string' || !value.trim()) {
    return `${fieldName} is required`;
  }
  return validateString(value, fieldName, maxLength);
}

/**
 * Validate integer ID.
 */
export function validateId(value: unknown, fieldName: string = 'ID'): number | null {
  const num = parseInt(String(value));
  if (isNaN(num) || num <= 0) return null;
  return num;
}

/**
 * Sanitize text content to prevent XSS.
 * Strips HTML tags and special characters.
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate email format.
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
