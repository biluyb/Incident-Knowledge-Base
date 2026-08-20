import { NextRequest, NextResponse } from 'next/server';
import { search } from '@/lib/search';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const group = searchParams.get('group') || undefined;
  const priority = searchParams.get('priority') || undefined;
  const severity = searchParams.get('severity') || undefined;
  const sort = (searchParams.get('sort') as any) || 'relevance';

  if (!q.trim()) {
    return NextResponse.json({ query: q, results: [], total: 0 });
  }

  try {
    const { results, total } = await search(q, { group, priority, severity, sort });

    // Log search analytics (fire and forget)
    query(
      `INSERT INTO search_analytics (query, results_count) VALUES ($1, $2)`,
      [q, total]
    ).catch(() => {});

    return NextResponse.json({ query: q, results, total });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
