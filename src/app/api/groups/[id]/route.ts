import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Get group
    const group = await queryOne(`
      SELECT * FROM groups WHERE id = $1 OR UPPER(code) = UPPER($1)
    `, [id]);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Get subtypes, tickets, articles in parallel
    const [subtypes, tickets, articles, keywords] = await Promise.all([
      query(`
        SELECT * FROM subtypes WHERE group_id = $1 ORDER BY code
      `, [group.id]),
      query(`
        SELECT t.*, g.code as group_code, g.name as group_name
        FROM tickets t
        LEFT JOIN groups g ON t.group_id = g.id
        WHERE t.group_id = $1
        ORDER BY t.created_at_ticket DESC NULLS LAST
      `, [group.id]),
      query(`
        SELECT ka.*, s.code as subtype_code
        FROM knowledge_articles ka
        LEFT JOIN subtypes s ON ka.subtype_id = s.id
        WHERE ka.group_id = $1
        ORDER BY ka.title
      `, [group.id]),
      query(`
        SELECT * FROM keywords WHERE group_id = $1 ORDER BY keyword
      `, [group.id]),
    ]);

    return NextResponse.json({ ...group, subtypes, tickets, articles, keywords });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
