import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const subgroup = await queryOne(`
      SELECT s.*, g.code as group_code, g.name as group_name,
        (SELECT COUNT(*) FROM tickets t WHERE t.subgroup_id = s.id)::int as ticket_count
      FROM subtypes s
      LEFT JOIN groups g ON s.group_id = g.id
      WHERE s.id = $1
    `, [parseInt(id) || 0]);

    if (!subgroup) {
      return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });
    }

    return NextResponse.json(subgroup);
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
    const { code, name, description, group_id } = body;

    const existing = await queryOne('SELECT id FROM subtypes WHERE id = $1', [parseInt(id) || 0]);
    if (!existing) {
      return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });
    }

    // Check code uniqueness if changed
    if (code) {
      const dup = await queryOne(
        'SELECT id FROM subtypes WHERE UPPER(code) = UPPER($1) AND id != $2',
        [code, parseInt(id) || 0]
      );
      if (dup) {
        return NextResponse.json({ error: `Subgroup code "${code}" already exists` }, { status: 409 });
      }
    }

    await queryOne(`
      UPDATE subtypes SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = $3,
        group_id = COALESCE($4, group_id),
        updated_at = NOW()
      WHERE id = $5
    `, [code?.toUpperCase() || null, name || null, description, group_id || null, parseInt(id) || 0]);

    return NextResponse.json({ message: 'Subgroup updated' });
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
    const subgroup = await queryOne('SELECT id FROM subtypes WHERE id = $1', [parseInt(id) || 0]);
    if (!subgroup) {
      return NextResponse.json({ error: 'Subgroup not found' }, { status: 404 });
    }

    // Check for linked tickets
    const ticketCount = await queryOne(
      'SELECT COUNT(*)::int as count FROM tickets WHERE subgroup_id = $1',
      [parseInt(id) || 0]
    );
    if (ticketCount && ticketCount.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete subgroup with ${ticketCount.count} linked incidents. Reassign them first.` },
        { status: 409 }
      );
    }

    await query('DELETE FROM subtypes WHERE id = $1', [parseInt(id) || 0]);
    return NextResponse.json({ message: 'Subgroup deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
