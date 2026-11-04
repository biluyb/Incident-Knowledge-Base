import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'incident.assign');
  if (auth.error) return auth.error;

  const { id } = await params;
  const ticketId = parseInt(id) || 0;

  if (!ticketId) {
    return NextResponse.json({ error: 'Valid incident ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { assigned_to, notes } = body;

    const ticket = await queryOne<any>(
      'SELECT id, reference, status, assigned_to FROM tickets WHERE id = $1',
      [ticketId]
    );

    if (!ticket) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    let assigneeName: string | null = null;
    if (assigned_to) {
      const user = await queryOne<{ id: number; name: string }>(
        'SELECT id, name FROM users WHERE id = $1',
        [assigned_to]
      );
      if (!user) {
        return NextResponse.json({ error: 'Assigned staff user not found' }, { status: 404 });
      }
      assigneeName = user.name;
    }

    // Update ticket owner
    await queryOne(`
      UPDATE tickets 
      SET assigned_to = $1, internal_owner = $2, updated_at = NOW()
      WHERE id = $3
    `, [assigned_to || null, assigneeName || null, ticketId]);

    // Record in incident history if table exists
    try {
      await query(`
        INSERT INTO incident_history (ticket_id, changed_by, old_status, new_status, action_type, notes)
        VALUES ($1, $2, $3, $4, 'reassigned', $5)
      `, [
        ticketId,
        auth.user.userId,
        ticket.status,
        ticket.status,
        notes || (assigneeName ? `Assigned to ${assigneeName}` : 'Unassigned'),
      ]);
    } catch (historyErr) {
      console.warn('Incident history record skipped:', historyErr);
    }

    // Audit log
    await auditLog({
      userId: auth.user.userId,
      action: 'incident.assign',
      entityType: 'incident',
      entityId: ticketId,
      details: `Assigned incident ${ticket.reference} to ${assigneeName || 'nobody'}`,
    });

    return NextResponse.json({
      message: 'Incident assignment updated successfully',
      assigned_to: assigned_to || null,
      internal_owner: assigneeName || null,
    });
  } catch (err: any) {
    console.error('Incident assignment error:', err);
    return NextResponse.json({ error: 'Failed to assign incident' }, { status: 500 });
  }
}

