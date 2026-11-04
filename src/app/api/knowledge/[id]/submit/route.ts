import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { requirePermission, auditLog } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'knowledge.create');
  if (auth.error) return auth.error;

  const { id } = await params;
  const articleId = parseInt(id) || 0;

  if (!articleId) {
    return NextResponse.json({ error: 'Valid article ID is required' }, { status: 400 });
  }

  try {
    const article = await queryOne<{ id: number; title: string; status: string }>(
      'SELECT id, title, status FROM knowledge_articles WHERE id = $1',
      [articleId]
    );

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    if (article.status === 'approved' || article.status === 'published') {
      return NextResponse.json({ error: 'Article is already approved/published' }, { status: 400 });
    }

    await queryOne(`
      UPDATE knowledge_articles 
      SET status = 'submitted', updated_at = NOW() 
      WHERE id = $1
    `, [articleId]);

    await auditLog({
      userId: auth.user.userId,
      action: 'knowledge.submit',
      entityType: 'knowledge',
      entityId: articleId,
      details: `Submitted article "${article.title}" for review`,
    });

    return NextResponse.json({ message: 'Article submitted for review successfully', status: 'submitted' });
  } catch (err: any) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: 'Failed to submit article' }, { status: 500 });
  }
}
