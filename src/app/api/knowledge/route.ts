import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get('group');
  const subtypeId = searchParams.get('subtype_id');
  const status = searchParams.get('status') || 'published';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (status !== 'all') {
      conditions.push(`ka.status = $${paramIdx++}`);
      params.push(status);
    }
    if (group) {
      conditions.push(`UPPER(g.code) = UPPER($${paramIdx++})`);
      params.push(group);
    }
    if (subtypeId) {
      conditions.push(`ka.subtype_id = $${paramIdx++}`);
      params.push(parseInt(subtypeId));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const articles = await query(`
      SELECT ka.*, g.code as group_code, g.name as group_name,
             s.code as subtype_code
      FROM knowledge_articles ka
      LEFT JOIN groups g ON ka.group_id = g.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      ${where}
      ORDER BY ka.title
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `, [...params, limit, offset]);

    return NextResponse.json({ articles, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title, reference, group_id, subtype_id,
      symptoms, root_cause, diagnostic_data,
      immediate_fix, permanent_fix, prevention, verification,
      temenos_contact, notes,
    } = body;

    if (!title || !reference || !group_id) {
      return NextResponse.json(
        { error: 'Title, reference, and group are required' },
        { status: 400 }
      );
    }

    // Create the knowledge article
    const article = await queryOne<{ id: number }>(`
      INSERT INTO knowledge_articles
        (title, group_id, subtype_id, status, symptoms, root_cause, diagnostic_data,
         immediate_fix, permanent_fix, prevention, verification, temenos_contact, notes)
      VALUES ($1, $2, $3, 'published', $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      title, group_id, subtype_id || null,
      symptoms || null, root_cause || null, diagnostic_data || null,
      immediate_fix || null, permanent_fix || null, prevention || null,
      verification || null, temenos_contact || null, notes || null,
    ]);

    if (!article) {
      return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
    }

    // Link to existing ticket if reference matches
    const ticket = await queryOne<{ id: number }>(
      'SELECT id FROM tickets WHERE UPPER(reference) = UPPER($1)',
      [reference]
    );

    if (ticket) {
      await query(
        'INSERT INTO ticket_articles (ticket_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [ticket.id, article.id]
      );
    }

    return NextResponse.json({ id: article.id, message: 'Article created' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
