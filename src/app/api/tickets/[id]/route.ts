import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Try by reference first, then by ID
    let ticket = await queryOne(`
      SELECT t.*, g.code as group_code, g.name as group_name
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE UPPER(t.reference) = UPPER($1)
    `, [id]);

    if (!ticket) {
      ticket = await queryOne(`
        SELECT t.*, g.code as group_code, g.name as group_name
        FROM tickets t
        LEFT JOIN groups g ON t.group_id = g.id
        WHERE t.id = $1
      `, [parseInt(id) || 0]);
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get related knowledge articles
    const relatedArticles = await query(`
      SELECT ka.id, ka.title, ka.status, s.code as subtype_code,
             g.code as group_code, g.name as group_name
      FROM knowledge_articles ka
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      LEFT JOIN groups g ON ka.group_id = g.id
      WHERE ka.group_id = $1 AND ka.status = 'published'
      ORDER BY ka.title
      LIMIT 5
    `, [ticket.group_id]);

    return NextResponse.json({ ...ticket, related_articles: relatedArticles });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
