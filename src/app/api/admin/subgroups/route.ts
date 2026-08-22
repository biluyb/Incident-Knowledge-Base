import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog, validateRequired } from '@/lib/api-auth';

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
  const auth = await requirePermission(request, 'subtype.create');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { code, name, description, group_id } = body;

    const codeError = validateRequired(code, 'Code', 20);
    if (codeError) return NextResponse.json({ error: codeError }, { status: 400 });

    const nameError = validateRequired(name, 'Name', 500);
    if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

    if (!group_id) {
      return NextResponse.json({ error: 'Group is required' }, { status: 400 });
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
    `, [code.toUpperCase().trim(), name.trim(), description || null, group_id]);

    if (!result) {
      return NextResponse.json({ error: 'Failed to create subgroup' }, { status: 500 });
    }

    await auditLog({
      userId: auth.user.userId,
      action: 'subtype.create',
      entityType: 'subtype',
      entityId: result.id,
      details: `Created subgroup ${code} in group ${group_id}`,
    });

    return NextResponse.json({ id: result.id, message: 'Subgroup created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
