import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { queryOne, query } from './db';
import { cookies } from 'next/headers';
import type { User } from './types';

// ============================================================
// Configuration
// ============================================================
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
);
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_COOKIE_NAME = 'kb-session';
const SALT_ROUNDS = 12;

// ============================================================
// Password Helpers
// ============================================================
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// JWT Session Helpers
// ============================================================
export interface SessionPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

export async function createSession(user: { id: number; email: string; role: string; name: string }): Promise<string> {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };

  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ============================================================
// Cookie Helpers
// ============================================================
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionFromCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

// ============================================================
// User Lookup
// ============================================================
export async function getUserById(id: number): Promise<User | null> {
  return queryOne<User>(
    'SELECT id, name, email, role, status, created_at, updated_at, last_login FROM users WHERE id = $1',
    [id]
  );
}

export async function getUserByEmail(email: string): Promise<any | null> {
  return queryOne(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  return getSessionFromCookie();
}

// ============================================================
// User Management (Admin)
// ============================================================
export async function createUser(name: string, email: string, password: string, role: string = 'viewer'): Promise<number> {
  const passwordHash = await hashPassword(password);
  const result = await queryOne<{ id: number }>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, email, passwordHash, role]
  );
  if (!result) throw new Error('Failed to create user');
  return result.id;
}

export async function updateUserRole(userId: number, role: string): Promise<void> {
  await queryOne(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
    [role, userId]
  );
}

export async function updateUserStatus(userId: number, status: string): Promise<void> {
  await queryOne(
    'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, userId]
  );
}

export async function deleteUser(userId: number): Promise<void> {
  await queryOne('DELETE FROM users WHERE id = $1', [userId]);
}

export async function listUsers(): Promise<any[]> {
  return query(
    'SELECT id, name, email, role, status, created_at, updated_at, last_login FROM users ORDER BY created_at DESC'
  );
}

export async function updateLastLogin(userId: number): Promise<void> {
  await queryOne('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
}
