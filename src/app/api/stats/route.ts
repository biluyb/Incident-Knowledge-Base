import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { DashboardStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [tickets, groups, articles, subtypes, keywords, priorities, rootCauses, groupDist, statusDist] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) as count FROM tickets'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM groups'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM knowledge_articles WHERE status = $1', ['published']),
      query<{ count: string }>('SELECT COUNT(*) as count FROM subtypes'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM keywords'),
      query<{ priority: string; count: string }>('SELECT priority, COUNT(*)::text as count FROM tickets WHERE priority IS NOT NULL GROUP BY priority ORDER BY count DESC'),
      query<{ category: string; count: string }>('SELECT root_cause_category as category, COUNT(*)::text as count FROM tickets WHERE root_cause_category IS NOT NULL GROUP BY root_cause_category ORDER BY count DESC LIMIT 10'),
      query<{ code: string; name: string; count: string }>(`
        SELECT g.code, g.name, COUNT(t.id)::text as count
        FROM groups g
        LEFT JOIN tickets t ON t.group_id = g.id
        GROUP BY g.id, g.code, g.name
        ORDER BY COUNT(t.id) DESC
      `),
      query<{ status: string; count: string }>('SELECT status, COUNT(*)::text as count FROM tickets WHERE status IS NOT NULL GROUP BY status ORDER BY count DESC'),
    ]);

    const priorityMap: Record<string, number> = {};
    priorities.forEach(p => { priorityMap[p.priority.toLowerCase()] = parseInt(p.count); });

    const stats: DashboardStats = {
      total_tickets: parseInt(tickets[0]?.count || '0'),
      total_groups: parseInt(groups[0]?.count || '0'),
      total_articles: parseInt(articles[0]?.count || '0'),
      total_subtypes: parseInt(subtypes[0]?.count || '0'),
      total_keywords: parseInt(keywords[0]?.count || '0'),
      critical_count: priorityMap['critical'] || 0,
      high_count: priorityMap['high'] || 0,
      medium_count: priorityMap['medium'] || 0,
      low_count: priorityMap['low'] || 0,
      group_distribution: groupDist.map(g => ({ code: g.code, name: g.name, count: parseInt(g.count) })),
      root_cause_distribution: rootCauses.map(r => ({ category: r.category, count: parseInt(r.count) })),
      status_distribution: statusDist.map(s => ({ status: s.status, count: parseInt(s.count) })),
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
