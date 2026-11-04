import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'incident.edit');
  if (auth.error) return auth.error;

  const { id } = await params;
  const ticketId = parseInt(id) || 0;

  if (!ticketId) {
    return NextResponse.json({ error: 'Valid incident ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status, notes, temenos_status, follow_up_date } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const ticket = await queryOne<any>(
      'SELECT id, reference, status, resolved_at FROM tickets WHERE id = $1',
      [ticketId]
    );

    if (!ticket) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    const oldStatus = ticket.status;
    let resolvedAtUpdate = ticket.resolved_at;
    if (status.toLowerCase().includes('resolved') && !ticket.resolved_at) {
      resolvedAtUpdate = new Date().toISOString();
    }

    await queryOne(`
      UPDATE tickets 
      SET status = $1,
          temenos_status = COALESCE($2, temenos_status),
          follow_up_date = COALESCE($3, follow_up_date),
          resolved_at = $4,
          updated_at = NOW()
      WHERE id = $5
    `, [
      status,
      temenos_status || null,
      follow_up_date || null,
      resolvedAtUpdate,
      ticketId,
    ]);

    // Record in history
    try {
      await query(`
        INSERT INTO incident_history (ticket_id, changed_by, old_status, new_status, action_type, notes)
        VALUES ($1, $2, $3, $4, 'status_change', $5)
      `, [
        ticketId,
        auth.user.userId,
        oldStatus,
        status,
        notes || `Status changed from ${oldStatus} to ${status}`,
      ]);
    } catch (historyErr) {
      console.warn('Incident history record skipped:', historyErr);
    }

    await auditLog({
      userId: auth.user.userId,
      action: 'incident.status',
      entityType: 'incident',
      entityId: ticketId,
      details: `Status of ${ticket.reference} updated to ${status} (${notes || 'No note'})`,
    });

    return NextResponse.json({
      message: 'Status updated successfully',
      old_status: oldStatus,
      new_status: status,
    });
  } catch (err: any) {
    console.error('Incident status update error:', err);
    return NextResponse.json({ error: 'Failed to update incident status' }, { status: 500 });
  }
}

