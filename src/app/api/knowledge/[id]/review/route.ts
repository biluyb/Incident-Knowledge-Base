import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'knowledge.approve');
  if (auth.error) return auth.error;

  const { id } = await params;
  const articleId = parseInt(id) || 0;

  if (!articleId) {
    return NextResponse.json({ error: 'Valid article ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { action, notes } = body; // action: 'approve' | 'reject' | 'under_review'

    if (!['approve', 'reject', 'under_review'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be approve, reject, or under_review' },
        { status: 400 }
      );
    }

    const article = await queryOne<any>(
      'SELECT * FROM knowledge_articles WHERE id = $1',
      [articleId]
    );

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    let targetStatus = 'under_review';
    if (action === 'approve') targetStatus = 'approved';
    if (action === 'reject') targetStatus = 'rejected';

    // If approving, snapshot prior approved version into knowledge_versions if table exists
    if (action === 'approve') {
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
          article.title,
          JSON.stringify({
            title: article.title,
            symptoms: article.symptoms,
            root_cause: article.root_cause,
            diagnostic_data: article.diagnostic_data,
            immediate_fix: article.immediate_fix,
            permanent_fix: article.permanent_fix,
            prevention: article.prevention,
            verification: article.verification,
            temenos_contact: article.temenos_contact,
            notes: article.notes,
          }),
          auth.user.userId,
          notes ? `Approved: ${notes}` : 'Initial approved version',
        ]);
      } catch (versionErr) {
        // Safe if table doesn't exist yet
        console.warn('Version snapshot skipped:', versionErr);
      }
    }

    // Update article status
    await queryOne(`
      UPDATE knowledge_articles 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2
    `, [targetStatus, articleId]);

    // Record review comment if notes provided
    if (notes && notes.trim()) {
      try {
        await query(`
          INSERT INTO kb_comments (entity_type, entity_id, author, body)
          VALUES ('knowledge', $1, $2, $3)
        `, [
          articleId,
          `${auth.user.email} (${auth.user.role})`,
          `[Review Decision: ${action.toUpperCase()}] ${notes.trim()}`,
        ]);
      } catch (commentErr) {
        console.warn('Comment insert skipped:', commentErr);
      }
    }

    await auditLog({
      userId: auth.user.userId,
      action: `knowledge.review.${action}`,
      entityType: 'knowledge',
      entityId: articleId,
      details: `${action.toUpperCase()} article "${article.title}" with notes: ${notes || 'None'}`,
    });

    return NextResponse.json({
      message: `Article ${targetStatus} successfully`,
      status: targetStatus,
    });
  } catch (err: any) {
    console.error('Review error:', err);
    return NextResponse.json({ error: 'Failed to process review' }, { status: 500 });
  }
}
