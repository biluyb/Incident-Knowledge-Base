import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, validateRequired, validateString, validateEmail } from '@/lib/api-auth';
import { getUserById } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { auditLog } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/profile
 * Returns the current user's full profile.
 */
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const user = await getUserById(authUser.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login: user.last_login,
      },
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PUT /api/auth/profile
 * Updates the current user's own profile.
 * Users can only edit: name, email.
 * Users CANNOT edit: role, status, password (via this endpoint).
 * The user ID is derived from the JWT session, NOT from the request body.
 */
export async function PUT(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email } = body;

    // Validate name
    const nameError = validateRequired(name, 'Name', 200);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    // Validate email
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.trim();
    if (!validateEmail(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Get current user data for comparison
    const currentUser = await getUserById(authUser.userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is being changed and if it conflicts with another user
    if (trimmedEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      const existing = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
        [trimmedEmail, authUser.userId]
      );
      if (existing) {
        return NextResponse.json({ error: 'Email is already in use by another account' }, { status: 409 });
      }
    }

    // Only update if values actually changed
    const nameChanged = trimmedName !== currentUser.name;
    const emailChanged = trimmedEmail.toLowerCase() !== currentUser.email.toLowerCase();

    if (nameChanged || emailChanged) {
      await queryOne(
        'UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3',
        [trimmedName, trimmedEmail, authUser.userId]
      );

      await auditLog({
        userId: authUser.userId,
        action: 'user.profile_update',
        entityType: 'user',
        entityId: authUser.userId,
        details: [
          nameChanged ? `name: "${currentUser.name}" → "${trimmedName}"` : null,
          emailChanged ? `email: "${currentUser.email}" → "${trimmedEmail}"` : null,
        ].filter(Boolean).join(', '),
      });
    }

    // Return updated user
    const updatedUser = await getUserById(authUser.userId);
    return NextResponse.json({
      user: {
        id: updatedUser!.id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        role: updatedUser!.role,
        status: updatedUser!.status,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
