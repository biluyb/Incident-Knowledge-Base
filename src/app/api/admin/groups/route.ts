import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog, validateRequired } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const groups = await query(`
      SELECT g.*,
        (SELECT COUNT(*) FROM tickets t WHERE t.group_id = g.id)::int as ticket_count,
        (SELECT COUNT(*) FROM subtypes s WHERE s.group_id = g.id)::int as subgroup_count
      FROM groups g
      ORDER BY g.code
    `);
    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'group.create');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { code, name, description } = body;

    const codeError = validateRequired(code, 'Code', 50);
    if (codeError) return NextResponse.json({ error: codeError }, { status: 400 });

    const nameError = validateRequired(name, 'Name', 500);
    if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

    // Check for duplicate code
    const existing = await queryOne(
      'SELECT id FROM groups WHERE UPPER(code) = UPPER($1)',
      [code]
    );
    if (existing) {
      return NextResponse.json({ error: `Group code "${code}" already exists` }, { status: 409 });
    }

    const result = await queryOne<{ id: number }>(`
      INSERT INTO groups (code, name, description)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [code.toUpperCase().trim(), name.trim(), description || null]);

    if (!result) {
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    await auditLog({
      userId: auth.user.userId,
      action: 'group.create',
      entityType: 'group',
      entityId: result.id,
      details: `Created group ${code}`,
    });

    return NextResponse.json({ id: result.id, message: 'Group created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
