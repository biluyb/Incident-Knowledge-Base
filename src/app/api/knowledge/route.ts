import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog, validateRequired, getAuthUser } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get('group');
  const subtypeId = searchParams.get('subtype_id');
  const status = searchParams.get('status') || 'approved';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (status === 'pending' || status === 'review') {
      conditions.push(`ka.status IN ('submitted', 'under_review')`);
    } else if (status === 'draft') {
      conditions.push(`ka.status = 'draft'`);
    } else if (status === 'all') {
      // no status filter
    } else if (status === 'approved' || status === 'published') {
      // Include both legacy 'published' and modern 'approved'
      conditions.push(`ka.status IN ('approved', 'published')`);
    } else {
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
             s.code as subtype_code, s.name as subtype_name
      FROM knowledge_articles ka
      LEFT JOIN groups g ON ka.group_id = g.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      ${where}
      ORDER BY ka.updated_at DESC, ka.title ASC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `, [...params, limit, offset]);

    // Query pending review count
    let pendingCount = 0;
    try {
      const pendingRes = await queryOne<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM knowledge_articles WHERE status IN ('submitted', 'under_review')`
      );
      pendingCount = parseInt(pendingRes?.count || '0') || 0;
    } catch {
      pendingCount = 0;
    }

    return NextResponse.json({ articles, page, limit, pendingCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'knowledge.create');
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const {
      title, reference, group_id, subtype_id,
      symptoms, root_cause, diagnostic_data,
      immediate_fix, permanent_fix, prevention, verification,
      temenos_contact, notes, status,
    } = body;

    // Validate required fields
    const titleError = validateRequired(title, 'Title', 500);
    if (titleError) return NextResponse.json({ error: titleError }, { status: 400 });

    if (!group_id) {
      return NextResponse.json({ error: 'Group is required' }, { status: 400 });
    }

    // Default status: if user submits as 'submitted', allow it; else default to 'draft' or 'published'
    const targetStatus = status || 'draft';

    // Create the knowledge article
    const article = await queryOne<{ id: number }>(`
      INSERT INTO knowledge_articles
        (title, group_id, subtype_id, status, symptoms, root_cause, diagnostic_data,
         immediate_fix, permanent_fix, prevention, verification, temenos_contact, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      title.trim(),
      group_id,
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
    ]);

    if (!article) {
      return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
    }

    // Link to existing ticket if reference matches
    if (reference) {
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
    }

    // Audit log
    await auditLog({
      userId: auth.user.userId,
      action: 'knowledge.create',
      entityType: 'knowledge',
      entityId: article.id,
      details: `Created knowledge article: ${title.trim()} [status: ${targetStatus}]`,
    });

    return NextResponse.json({ id: article.id, status: targetStatus }, { status: 201 });
  } catch (error: any) {
    console.error('Knowledge creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
