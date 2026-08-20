import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get('group');
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
