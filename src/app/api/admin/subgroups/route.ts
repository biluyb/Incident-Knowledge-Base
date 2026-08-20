import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('group_id');

  try {
    let sql = `
      SELECT s.*, g.code as group_code, g.name as group_name,
        (SELECT COUNT(*) FROM tickets t WHERE t.subgroup_id = s.id)::int as ticket_count
      FROM subtypes s
      LEFT JOIN groups g ON s.group_id = g.id
    `;
    const params: any[] = [];

    if (groupId) {
      sql += ` WHERE s.group_id = $1`;
      params.push(parseInt(groupId));
    }

    sql += ` ORDER BY g.code, s.code`;

    const subtypes = await query(sql, params);
    return NextResponse.json(subtypes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, description, group_id } = body;

    if (!code || !name || !group_id) {
      return NextResponse.json({ error: 'Code, name, and group are required' }, { status: 400 });
    }

    // Verify group exists
    const group = await queryOne('SELECT id FROM groups WHERE id = $1', [group_id]);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check for duplicate code
    const existing = await queryOne(
      'SELECT id FROM subtypes WHERE UPPER(code) = UPPER($1)',
      [code]
    );
    if (existing) {
      return NextResponse.json({ error: `Subgroup code "${code}" already exists` }, { status: 409 });
    }

    const result = await queryOne<{ id: number }>(`
      INSERT INTO subtypes (code, name, description, group_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [code.toUpperCase(), name, description || null, group_id]);

    if (!result) {
      return NextResponse.json({ error: 'Failed to create subgroup' }, { status: 500 });
    }

    return NextResponse.json({ id: result.id, message: 'Subgroup created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
