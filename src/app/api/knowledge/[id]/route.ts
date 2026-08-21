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
    const {
      title, group_id, subtype_id, status,
      symptoms, root_cause, diagnostic_data,
      immediate_fix, permanent_fix, prevention,
      verification, temenos_contact, notes,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    await queryOne(`
      UPDATE knowledge_articles SET
        title = $1,
        group_id = $2,
        subtype_id = $3,
        status = $4,
        symptoms = $5,
        root_cause = $6,
        diagnostic_data = $7,
        immediate_fix = $8,
        permanent_fix = $9,
        prevention = $10,
        verification = $11,
        temenos_contact = $12,
        notes = $13,
        updated_at = NOW()
      WHERE id = $14
    `, [
      title.trim(),
      group_id || null,
      subtype_id || null,
      status || 'published',
      symptoms || null,
      root_cause || null,
      diagnostic_data || null,
      immediate_fix || null,
      permanent_fix || null,
      prevention || null,
      verification || null,
      temenos_contact || null,
      notes || null,
      articleId,
    ]);

    return NextResponse.json({ message: 'Article updated' });
  } catch (error: any) {
    console.error('Knowledge update error:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}
