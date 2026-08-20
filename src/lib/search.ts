import { query } from './db';
import type { SearchResult, SearchFilters } from './types';

/**
 * Normalize search query for better matching
 */
function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[-_.]+/g, ' ')       // Treat dots, hyphens, underscores as spaces
    .replace(/\s+/g, ' ')          // Collapse multiple spaces
    .replace(/["''`]/g, '')        // Remove quotes
    .trim();
}

/**
 * Search across knowledge articles and tickets
 */
export async function search(
  rawQuery: string,
  filters: SearchFilters = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const normalized = normalizeQuery(rawQuery);
  if (!normalized) return { results: [], total: 0 };

  // Split into words for broader matching
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  const tsQuery = words.join(' & ');  // AND semantics for full text
  const tsQueryOr = words.join(' | '); // OR semantics

  const results: SearchResult[] = [];

  // === 1. Exact keyword match (highest priority) ===
  const keywordResults = await query<{ type: string; id: number; title: string; summary: string; group_code: string; group_name: string; subtype_code: string; severity: string; priority: string; score: number }>(`
    SELECT 
      'knowledge' as type,
      ka.id,
      ka.title,
      ka.symptoms as summary,
      g.code as group_code,
      g.name as group_name,
      s.code as subtype_code,
      '' as severity,
      '' as priority,
      1.0 as score
    FROM keywords k
    JOIN knowledge_articles ka ON k.article_id = ka.id
    LEFT JOIN groups g ON ka.group_id = g.id
    LEFT JOIN subtypes s ON ka.subtype_id = s.id
    WHERE LOWER(k.keyword) = $1
      AND ka.status = 'published'
    UNION ALL
    SELECT
      'knowledge' as type,
      ka.id,
      ka.title,
      ka.symptoms as summary,
      g.code as group_code,
      g.name as group_name,
      s.code as subtype_code,
      '' as severity,
      '' as priority,
      0.95 as score
    FROM keywords k
    JOIN knowledge_articles ka ON k.article_id = ka.id
    LEFT JOIN groups g ON ka.group_id = g.id
    LEFT JOIN subtypes s ON ka.subtype_id = s.id
    WHERE LOWER(k.keyword) LIKE '%' || $1 || '%'
      AND ka.status = 'published'
    LIMIT 20
  `, [normalized]);

  keywordResults.forEach(r => results.push({
    type: r.type as 'knowledge' | 'ticket',
    id: r.id,
    title: r.title,
    summary: r.summary,
    group_code: r.group_code,
    group_name: r.group_name,
    subtype_code: r.subtype_code,
    severity: r.severity,
    priority: r.priority,
    score: r.score,
  }));

  // === 2. Full-text search on knowledge articles ===
  if (tsQuery) {
    const ftResults = await query<{ type: string; id: number; title: string; summary: string; group_code: string; group_name: string; subtype_code: string; severity: string; priority: string; score: number }>(`
      SELECT 
        'knowledge' as type,
        ka.id,
        ka.title,
        ka.symptoms as summary,
        g.code as group_code,
        g.name as group_name,
        s.code as subtype_code,
        '' as severity,
        '' as priority,
        ts_rank_cd(ka.search_vector, to_tsquery('english', $1)) as score
      FROM knowledge_articles ka
      LEFT JOIN groups g ON ka.group_id = g.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      WHERE ka.search_vector @@ to_tsquery('english', $1)
        AND ka.status = 'published'
      ORDER BY score DESC
      LIMIT 20
    `, [tsQuery]);

    ftResults.forEach(r => {
      if (!results.find(existing => existing.type === r.type && existing.id === r.id)) {
        results.push({
          type: r.type as 'knowledge' | 'ticket',
          id: r.id,
          title: r.title,
          summary: r.summary,
          group_code: r.group_code,
          group_name: r.group_name,
          subtype_code: r.subtype_code,
          severity: r.severity,
          priority: r.priority,
          score: Math.max(r.score * 0.9, 0.3),
        });
      }
    });
  }

  // === 3. Trigram similarity search on articles ===
  if (normalized.length >= 3) {
    const trigramResults = await query<{ type: string; id: number; title: string; summary: string; group_code: string; group_name: string; subtype_code: string; similarity: number }>(`
      SELECT 
        'knowledge' as type,
        ka.id,
        ka.title,
        ka.symptoms as summary,
        g.code as group_code,
        g.name as group_name,
        s.code as subtype_code,
        GREATEST(
          similarity(LOWER(ka.title), $1),
          similarity(LOWER(COALESCE(ka.symptoms, '')), $1)
        ) as similarity
      FROM knowledge_articles ka
      LEFT JOIN groups g ON ka.group_id = g.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      WHERE ka.status = 'published'
        AND (
          similarity(LOWER(ka.title), $1) > 0.15
          OR similarity(LOWER(COALESCE(ka.symptoms, '')), $1) > 0.15
        )
      ORDER BY similarity DESC
      LIMIT 15
    `, [normalized]);

    trigramResults.forEach(r => {
      if (!results.find(existing => existing.type === r.type && existing.id === r.id)) {
        results.push({
          type: r.type as 'knowledge' | 'ticket',
          id: r.id,
          title: r.title,
          summary: r.summary,
          group_code: r.group_code,
          group_name: r.group_name,
          subtype_code: r.subtype_code,
          score: r.similarity * 0.8,
        });
      }
    });
  }

  // === 4. Full-text search on tickets ===
  if (tsQuery) {
    const ticketFtResults = await query<{ type: string; id: number; title: string; summary: string; reference: string; group_code: string; group_name: string; severity: string; priority: string; score: number }>(`
      SELECT 
        'ticket' as type,
        t.id,
        t.reference as title,
        t.summary,
        t.reference,
        g.code as group_code,
        g.name as group_name,
        t.severity,
        t.priority,
        ts_rank_cd(t.search_vector, to_tsquery('english', $1)) as score
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE t.search_vector @@ to_tsquery('english', $1)
      ORDER BY score DESC
      LIMIT 20
    `, [tsQuery]);

    ticketFtResults.forEach(r => {
      if (!results.find(existing => existing.type === r.type && existing.id === r.id)) {
        results.push({
          type: r.type as 'knowledge' | 'ticket',
          id: r.id,
          title: r.title,
          summary: r.summary,
          group_code: r.group_code,
          group_name: r.group_name,
          severity: r.severity,
          priority: r.priority,
          score: Math.max(r.score * 0.7, 0.2),
        });
      }
    });
  }

  // === 5. Trigram search on tickets ===
  if (normalized.length >= 3) {
    const ticketTrigram = await query<{ type: string; id: number; title: string; summary: string; reference: string; group_code: string; group_name: string; severity: string; priority: string; similarity: number }>(`
      SELECT 
        'ticket' as type,
        t.id,
        t.reference as title,
        t.summary,
        t.reference,
        g.code as group_code,
        g.name as group_name,
        t.severity,
        t.priority,
        GREATEST(
          similarity(LOWER(t.reference), $1),
          similarity(LOWER(COALESCE(t.summary, '')), $1)
        ) as similarity
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE similarity(LOWER(t.reference), $1) > 0.1
         OR similarity(LOWER(COALESCE(t.summary, '')), $1) > 0.15
      ORDER BY similarity DESC
      LIMIT 15
    `, [normalized]);

    ticketTrigram.forEach(r => {
      if (!results.find(existing => existing.type === r.type && existing.id === r.id)) {
        results.push({
          type: r.type as 'knowledge' | 'ticket',
          id: r.id,
          title: r.title,
          summary: r.summary,
          group_code: r.group_code,
          group_name: r.group_name,
          severity: r.severity,
          priority: r.priority,
          score: r.similarity * 0.6,
        });
      }
    });
  }

  // === Apply filters ===
  let filtered = results;
  if (filters.group) {
    filtered = filtered.filter(r => r.group_code?.toUpperCase() === filters.group!.toUpperCase());
  }
  if (filters.severity) {
    filtered = filtered.filter(r => r.severity?.toLowerCase().includes(filters.severity!.toLowerCase()));
  }
  if (filters.priority) {
    filtered = filtered.filter(r => r.priority?.toLowerCase() === filters.priority!.toLowerCase());
  }

  // === Sort ===
  const sort = filters.sort || 'relevance';
  switch (sort) {
    case 'newest':
      // Keep relevance order for knowledge, newest for tickets
      break;
    case 'oldest':
      break;
    case 'priority': {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => (priorityOrder[a.priority || ''] ?? 4) - (priorityOrder[b.priority || ''] ?? 4));
      break;
    }
    default:
      // Relevance (default) - sort by score descending
      filtered.sort((a, b) => b.score - a.score);
  }

  return { results: filtered, total: filtered.length };
}
