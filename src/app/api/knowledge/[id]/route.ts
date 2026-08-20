import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Try by ID
    const article = await queryOne(`
      SELECT ka.*, g.code as group_code, g.name as group_name,
             s.code as subtype_code, s.name as subtype_name
      FROM knowledge_articles ka
      LEFT JOIN groups g ON ka.group_id = g.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      WHERE ka.id = $1
    `, [parseInt(id) || 0]);

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Get related tickets
    const relatedTickets = await query(`
      SELECT t.id, t.reference, t.summary, t.status, t.priority, t.severity,
             g.code as group_code
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE t.group_id = $1
      ORDER BY t.created_at_ticket DESC NULLS LAST
      LIMIT 10
    `, [article.group_id]);

    // Get references
    const references = await query(
      `SELECT * FROM references_table WHERE article_id = $1`,
      [article.id]
    );

    // Get contacts
    const contacts = await query(
      `SELECT * FROM contacts WHERE article_id = $1`,
      [article.id]
    );

    return NextResponse.json({ ...article, related_tickets: relatedTickets, references, contacts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
