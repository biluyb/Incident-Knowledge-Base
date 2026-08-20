import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const group = searchParams.get('group');
  const subgroup = searchParams.get('subgroup');
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
    if (subgroup) {
      conditions.push(`t.subgroup_id = $${paramIdx++}`);
      params.push(parseInt(subgroup));
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

    // Validate sort column
    const validSorts = ['created_at_ticket', 'reference', 'priority', 'severity', 'updated_at'];
    const sortCol = validSorts.includes(sort) ? `t.${sort}` : 't.created_at_ticket';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM tickets t LEFT JOIN groups g ON t.group_id = g.id ${where}`,
      params
    );

    const tickets = await query(
      `SELECT t.id, t.reference, t.summary, t.status, t.requester, t.created_at_ticket,
              t.resolved_at, t.permanently_closed_at, t.root_cause_category,
              t.priority, t.severity, t.group_id, t.subgroup_id,
              t.classification_confidence, t.legacy_group, t.custom_fields,
              g.code as group_code, g.name as group_name,
              s.name as subgroup_name, s.code as subgroup_code
       FROM tickets t
       LEFT JOIN groups g ON t.group_id = g.id
       LEFT JOIN subtypes s ON t.subgroup_id = s.id
       ${where}
       ORDER BY ${sortCol} ${sortOrder} NULLS LAST
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reference, summary, group_id, subgroup_id, priority, severity, status,
      root_cause_category, requester, dynamic_fields,
    } = body;

    if (!reference || !summary || !group_id) {
      return NextResponse.json(
        { error: 'Reference, summary, and group are required' },
        { status: 400 }
      );
    }

    // Check for duplicate reference
    const existing = await queryOne(
      'SELECT id FROM tickets WHERE UPPER(reference) = UPPER($1)',
      [reference]
    );
    if (existing) {
      return NextResponse.json(
        { error: `Incident ${reference} already exists` },
        { status: 409 }
      );
    }

    const result = await queryOne<{ id: number }>(`
      INSERT INTO tickets
        (reference, summary, group_id, subgroup_id, priority, severity, status,
         root_cause_category, requester, custom_fields)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      reference, summary, group_id, subgroup_id || null,
      priority || null, severity || null, status || 'Permanently Closed',
      root_cause_category || null, requester || null,
      JSON.stringify(dynamic_fields || {}),
    ]);

    if (!result) {
      return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
    }

    return NextResponse.json({ id: result.id, message: 'Incident created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
