import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const keywords = await query(`
      SELECT k.*, g.code as group_code, g.name as group_name
      FROM keywords k
      LEFT JOIN groups g ON k.group_id = g.id
      ORDER BY k.keyword
    `);

    return NextResponse.json(keywords);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
