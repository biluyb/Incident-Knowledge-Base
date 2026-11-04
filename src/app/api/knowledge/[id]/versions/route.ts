import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const articleId = parseInt(id) || 0;

  if (!articleId) {
    return NextResponse.json({ error: 'Valid article ID is required' }, { status: 400 });
  }

  try {
    const versions = await query(`
      SELECT kv.id, kv.article_id, kv.version_number, kv.title, kv.content_snapshot,
             kv.change_summary, kv.created_at, u.name as modifier_name
      FROM knowledge_versions kv
      LEFT JOIN users u ON kv.modified_by = u.id
      WHERE kv.article_id = $1
      ORDER BY kv.version_number DESC
    `, [articleId]);

    return NextResponse.json({ versions });
  } catch (err: any) {
    // If table doesn't exist yet, return empty list safely
    return NextResponse.json({ versions: [] });
  }
}
