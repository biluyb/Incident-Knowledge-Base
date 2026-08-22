import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { createUser, listUsers } from '@/lib/auth';
import { validateRequired, validateEmail, validateString } from '@/lib/api-auth';
import { auditLog } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'user.view');
  if (auth.error) return auth.error;

  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'user.manage');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    // Validate required fields
    const nameError = validateRequired(name, 'Name', 200);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const emailError = validateRequired(email, 'Email', 200);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['admin', 'knowledge_manager', 'contributor', 'viewer'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Create user
    const userId = await createUser(name.trim(), email.trim(), password, role || 'viewer');

    // Audit log
    await auditLog({
      userId: auth.user.userId,
      action: 'user.create',
      entityType: 'user',
      entityId: userId,
      details: `Created user ${email} with role ${role || 'viewer'}`,
    });

    return NextResponse.json({ id: userId, message: 'User created' }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
