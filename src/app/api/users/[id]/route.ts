import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, auditLog } from '@/lib/api-auth';
import { updateUserRole, updateUserStatus, deleteUser, getUserById } from '@/lib/auth';
import { isValidRole, canRemoveAdmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'user.manage');
  if (auth.error) return auth.error;

  const { id } = await params;
  const userId = parseInt(id) || 0;

  if (!userId) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { role, status } = body;

    // Get target user
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent removing last admin
    if (role && !isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (role === 'admin' || targetUser.role === 'admin') {
      const canRemove = await canRemoveAdmin(userId, auth.user.userId);
      if (!canRemove) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin user' },
          { status: 409 }
        );
      }
    }

    // Update role
    if (role && role !== targetUser.role) {
      await updateUserRole(userId, role);
      await auditLog({
        userId: auth.user.userId,
        action: 'user.role_change',
        entityType: 'user',
        entityId: userId,
        details: `Changed role from ${targetUser.role} to ${role} for ${targetUser.email}`,
      });
    }

    // Update status
    if (status && status !== targetUser.status) {
      await updateUserStatus(userId, status);
      await auditLog({
        userId: auth.user.userId,
        action: 'user.status_change',
        entityType: 'user',
        entityId: userId,
        details: `Changed status from ${targetUser.status} to ${status} for ${targetUser.email}`,
      });
    }

    return NextResponse.json({ message: 'User updated' });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'user.manage');
  if (auth.error) return auth.error;

  const { id } = await params;
  const userId = parseInt(id) || 0;

  if (!userId) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    // Get target user
    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting last admin
    const canRemove = await canRemoveAdmin(userId, auth.user.userId);
    if (!canRemove) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin user' },
        { status: 409 }
      );
    }

    // Prevent self-deletion
    if (userId === auth.user.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 409 }
      );
    }

    await deleteUser(userId);
    await auditLog({
      userId: auth.user.userId,
      action: 'user.delete',
      entityType: 'user',
      entityId: userId,
      details: `Deleted user ${targetUser.email}`,
    });

    return NextResponse.json({ message: 'User deleted' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
