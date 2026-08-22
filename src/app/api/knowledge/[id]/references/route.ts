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
    const references = await query(
      'SELECT * FROM references_table WHERE article_id = $1 ORDER BY id',
      [articleId]
    );
    return NextResponse.json(references);
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
    const { references } = body;

    if (!Array.isArray(references)) {
      return NextResponse.json({ error: 'references must be an array' }, { status: 400 });
    }

    // Delete existing references for this article
    await query('DELETE FROM references_table WHERE article_id = $1', [articleId]);

    // Insert new references
    for (const ref of references) {
      if (ref.title || ref.url) {
        await query(
          `INSERT INTO references_table (article_id, title, url, reference_type, description)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            articleId,
            ref.title || null,
            ref.url || null,
            ref.reference_type || null,
            ref.description || null,
          ]
        );
      }
    }

    return NextResponse.json({ message: 'References updated' });
  } catch (error: any) {
    console.error('References update error:', error);
    return NextResponse.json({ error: 'Failed to update references' }, { status: 500 });
  }
}
