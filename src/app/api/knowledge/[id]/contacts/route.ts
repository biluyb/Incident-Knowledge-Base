import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const articleId = parseInt(id) || 0;

  if (!articleId) {
    return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
  }

  try {
    const contacts = await query(
      'SELECT * FROM contacts WHERE article_id = $1 ORDER BY id',
      [articleId]
    );
    return NextResponse.json(contacts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const articleId = parseInt(id) || 0;

  if (!articleId) {
    return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
  }

  try {
    // Check article exists
    const existing = await queryOne('SELECT id FROM knowledge_articles WHERE id = $1', [articleId]);
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const body = await request.json();
    const { contacts } = body;

    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: 'contacts must be an array' }, { status: 400 });
    }

    // Delete existing contacts for this article
    await query('DELETE FROM contacts WHERE article_id = $1', [articleId]);

    // Insert new contacts
    for (const c of contacts) {
      if (c.name || c.email) {
        await query(
          `INSERT INTO contacts (article_id, name, email, teams, phone, notes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            articleId,
            c.name || null,
            c.email || null,
            c.teams || null,
            c.phone || null,
            c.notes || null,
          ]
        );
      }
    }

    return NextResponse.json({ message: 'Contacts updated' });
  } catch (error: any) {
    console.error('Contacts update error:', error);
    return NextResponse.json({ error: 'Failed to update contacts' }, { status: 500 });
  }
}
