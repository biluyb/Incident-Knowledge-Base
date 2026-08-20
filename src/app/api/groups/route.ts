import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const groups = await query(`
      SELECT 
        g.id, g.code, g.name, g.description, g.created_at, g.updated_at,
        COUNT(DISTINCT t.id)::int as ticket_count,
        COUNT(DISTINCT ka.id)::int as article_count,
        COUNT(DISTINCT s.id)::int as subtype_count
      FROM groups g
      LEFT JOIN tickets t ON t.group_id = g.id
      LEFT JOIN knowledge_articles ka ON ka.group_id = g.id AND ka.status = 'published'
      LEFT JOIN subtypes s ON s.group_id = g.id
      GROUP BY g.id, g.code, g.name, g.description, g.created_at, g.updated_at
      ORDER BY g.code
    `);

    return NextResponse.json(groups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
