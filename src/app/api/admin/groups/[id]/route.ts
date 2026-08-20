import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const group = await queryOne(`
      SELECT g.*,
        (SELECT COUNT(*) FROM tickets t WHERE t.group_id = g.id)::int as ticket_count,
        (SELECT COUNT(*) FROM subtypes s WHERE s.group_id = g.id)::int as subgroup_count
      FROM groups g
      WHERE g.id = $1 OR UPPER(g.code) = UPPER($1)
    `, [id]);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const subtypes = await query(
      'SELECT * FROM subtypes WHERE group_id = $1 ORDER BY code',
      [group.id]
    );

    return NextResponse.json({ ...group, subtypes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { code, name, description } = body;

    const existing = await queryOne('SELECT id FROM groups WHERE id = $1', [parseInt(id) || 0]);
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check code uniqueness if changed
    if (code) {
      const dup = await queryOne(
        'SELECT id FROM groups WHERE UPPER(code) = UPPER($1) AND id != $2',
        [code, parseInt(id) || 0]
      );
      if (dup) {
        return NextResponse.json({ error: `Group code "${code}" already exists` }, { status: 409 });
      }
    }

    await queryOne(`
      UPDATE groups SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [code?.toUpperCase() || null, name || null, description, parseInt(id) || 0]);

    return NextResponse.json({ message: 'Group updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const group = await queryOne('SELECT id FROM groups WHERE id = $1', [parseInt(id) || 0]);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check for linked tickets
    const ticketCount = await queryOne(
      'SELECT COUNT(*)::int as count FROM tickets WHERE group_id = $1',
      [parseInt(id) || 0]
    );
    if (ticketCount && ticketCount.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete group with ${ticketCount.count} linked incidents. Reassign them first.` },
        { status: 409 }
      );
    }

    // Delete subtypes first
    await query('DELETE FROM subtypes WHERE group_id = $1', [parseInt(id) || 0]);
    await query('DELETE FROM groups WHERE id = $1', [parseInt(id) || 0]);

    return NextResponse.json({ message: 'Group deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
