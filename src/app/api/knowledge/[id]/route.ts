import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog, validateRequired } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
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

    // Get version history
    let versions: any[] = [];
    try {
      versions = await query(`
        SELECT kv.id, kv.version_number, kv.title, kv.change_summary, kv.created_at,
               u.name as modifier_name
        FROM knowledge_versions kv
        LEFT JOIN users u ON kv.modified_by = u.id
        WHERE kv.article_id = $1
        ORDER BY kv.version_number DESC
      `, [article.id]);
    } catch {
      // Table may not exist yet in dev
      versions = [];
    }

    return NextResponse.json({
      ...article,
      related_tickets: relatedTickets,
      references,
      contacts,
      versions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'knowledge.edit');
  if (auth.error) return auth.error;

  const { id } = await params;
  const articleId = parseInt(id) || 0;

  if (!articleId) {
    return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
  }

  try {
    const existing = await queryOne<any>(
      'SELECT * FROM knowledge_articles WHERE id = $1',
      [articleId]
    );
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title, group_id, subtype_id, status,
      symptoms, root_cause, diagnostic_data,
      immediate_fix, permanent_fix, prevention,
      verification, temenos_contact, notes,
      change_summary,
    } = body;

    const titleError = validateRequired(title, 'Title', 500);
    if (titleError) return NextResponse.json({ error: titleError }, { status: 400 });

    // If existing article was approved or published, archive a snapshot before updating
    if (['approved', 'published'].includes(existing.status)) {
      try {
        const countRes = await queryOne<{ count: string }>(
          'SELECT COUNT(*)::text as count FROM knowledge_versions WHERE article_id = $1',
          [articleId]
        );
        const nextVersion = (parseInt(countRes?.count || '0') || 0) + 1;

        await query(`
          INSERT INTO knowledge_versions (article_id, version_number, title, content_snapshot, modified_by, change_summary)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          articleId,
          nextVersion,
          existing.title,
          JSON.stringify({
            title: existing.title,
            symptoms: existing.symptoms,
            root_cause: existing.root_cause,
            diagnostic_data: existing.diagnostic_data,
            immediate_fix: existing.immediate_fix,
            permanent_fix: existing.permanent_fix,
            prevention: existing.prevention,
            verification: existing.verification,
            temenos_contact: existing.temenos_contact,
            notes: existing.notes,
          }),
          auth.user.userId,
          change_summary || 'Prior version before update',
        ]);
      } catch (versionErr) {
        console.warn('Failed to snapshot version:', versionErr);
      }
    }

    // Determine target status
    const targetStatus = status || existing.status || 'published';

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
      targetStatus,
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

    // Audit log
    await auditLog({
      userId: auth.user.userId,
      action: 'knowledge.update',
      entityType: 'knowledge',
      entityId: articleId,
      details: `Updated knowledge article: ${title.trim()} (${change_summary || 'No change summary'})`,
    });

    return NextResponse.json({ message: 'Article updated successfully', status: targetStatus });
  } catch (error: any) {
    console.error('Knowledge update error:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}
