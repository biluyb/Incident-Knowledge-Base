import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const group = searchParams.get('group');
  const priority = searchParams.get('priority');
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const sort = searchParams.get('sort') || 'created_at_ticket';
  const order = searchParams.get('order') || 'DESC';
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (group) {
      conditions.push(`UPPER(g.code) = UPPER($${paramIdx++})`);
      params.push(group);
    }
    if (priority) {
      conditions.push(`LOWER(t.priority) = LOWER($${paramIdx++})`);
      params.push(priority);
    }
    if (severity) {
      conditions.push(`LOWER(t.severity) LIKE LOWER($${paramIdx++})`);
      params.push(`%${severity}%`);
    }
    if (status) {
      conditions.push(`LOWER(t.status) LIKE LOWER($${paramIdx++})`);
      params.push(`%${status}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const validSorts = ['created_at_ticket', 'reference', 'priority', 'severity'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at_ticket';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM tickets t LEFT JOIN groups g ON t.group_id = g.id ${where}`,
      params
    );

    const tickets = await query(
      `SELECT t.id, t.reference, t.summary, t.status, t.requester, t.created_at_ticket,
              t.resolved_at, t.permanently_closed_at, t.root_cause_category,
              t.priority, t.severity, t.group_id,
              g.code as group_code, g.name as group_name
       FROM tickets t
       LEFT JOIN groups g ON t.group_id = g.id
       ${where}
       ORDER BY t.${sortCol} ${sortOrder} NULLS LAST
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      tickets,
      total: parseInt(countResult?.count || '0'),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult?.count || '0') / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
