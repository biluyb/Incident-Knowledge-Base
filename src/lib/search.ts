import { query } from './db';
import type { SearchResult, SearchFilters } from './types';

/**
 * Normalize search query for better matching.
 * Handles hyphens, dots, underscores, extra spaces, quotes.
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
 * Generate ILIKE variants for typo tolerance.
 * Returns an array of SQL patterns for partial matching.
 */
function generateLikePatterns(query: string): string[] {
  const words = query.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return [`%${query}%`];

  // For each word, create a pattern: %word%
  const patterns: string[] = [];
  for (const word of words) {
    patterns.push(`%${word}%`);
  }
  // Also add the full query as one pattern
  patterns.push(`%${query}%`);
  return patterns;
}

/**
 * Search across knowledge articles, tickets, and quick lookup keywords.
 * Improved with typo tolerance and better ranking.
 *
 * Ranking:
 *   Highest  — Exact ticket number (TSR-3183311)
 *   Very high — Partial ticket reference
 *   High     — Quick lookup keyword match
 *   Medium-high — Full-text on tickets
 *   Medium   — Trigram similarity on tickets (typo-tolerant)
 *   Lower    — Full-text on knowledge articles
 *   Lowest   — Trigram on knowledge articles
 */
export async function search(
  rawQuery: string,
  filters: SearchFilters = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const normalized = normalizeQuery(rawQuery);
  if (!normalized) return { results: [], total: 0 };

  const results: SearchResult[] = [];
  const seen = new Set<string>(); // dedup key: "type:id"

  function addResult(r: SearchResult) {
    const key = `${r.type}:${r.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(r);
    }
  }

  // === 1. EXACT TICKET REFERENCE (Highest priority) ===
  const refResults = await query<{
    type: string; id: number; reference: string; summary: string;
    group_code: string; group_name: string; subgroup_code: string;
    severity: string; priority: string;
  }>(`
    SELECT 'ticket' as type, t.id, t.reference,
           t.summary, g.code as group_code, g.name as group_name,
           '' as subtype_code, t.severity, t.priority
    FROM tickets t
    LEFT JOIN groups g ON t.group_id = g.id
    WHERE UPPER(t.reference) = UPPER($1)
       OR UPPER(t.reference) = UPPER($2)
    LIMIT 5
  `, [rawQuery.trim(), `TSR-${rawQuery.trim()}`]);

  refResults.forEach(r => addResult({
    type: 'ticket',
    id: r.id,
    title: r.reference,
    summary: r.summary,
    group_code: r.group_code,
    group_name: r.group_name,
    subtype_code: r.subgroup_code,
    severity: r.severity,
    priority: r.priority,
    score: 1.0, // Highest
  }));

  // === 2. PARTIAL TICKET REFERENCE (Very high) ===
  if (normalized.length >= 3) {
    const partialRefResults = await query<{
      id: number; reference: string; summary: string;
      group_code: string; group_name: string;
      severity: string; priority: string; sim: number;
    }>(`
      SELECT t.id, t.reference,
             t.summary, g.code as group_code, g.name as group_name,
             t.severity, t.priority,
             similarity(LOWER(t.reference), $1) as sim
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE similarity(LOWER(t.reference), $1) > 0.2
      ORDER BY sim DESC
      LIMIT 10
    `, [normalized]);

    partialRefResults.forEach(r => addResult({
      type: 'ticket',
      id: r.id,
      title: r.reference,
      summary: r.summary,
      group_code: r.group_code,
      group_name: r.group_name,
      severity: r.severity,
      priority: r.priority,
      score: 0.95,
    }));
  }

  // === 3. QUICK LOOKUP KEYWORD → GROUP MAPPING ===
  const quickLookupResults = await query<{
    keyword: string; group_code: string; group_name: string;
    article_id: number; article_title: string; subtype_code: string;
  }>(`
    SELECT k.keyword, g.code as group_code, g.name as group_name,
           k.article_id, ka.title as article_title, s.code as subtype_code
    FROM keywords k
    LEFT JOIN groups g ON k.group_id = g.id
    LEFT JOIN knowledge_articles ka ON k.article_id = ka.id
    LEFT JOIN subtypes s ON ka.subtype_id = s.id
    WHERE LOWER(k.keyword) = $1
       OR LOWER(k.keyword) LIKE '%' || $1 || '%'
       OR $1 % LOWER(k.keyword)
    ORDER BY
      CASE WHEN LOWER(k.keyword) = $1 THEN 0
           WHEN LOWER(k.keyword) LIKE '%' || $1 || '%' THEN 1
           ELSE 2 END
    LIMIT 10
  `, [normalized]);

  quickLookupResults.forEach(r => {
    if (r.article_id) {
      addResult({
        type: 'knowledge',
        id: r.article_id,
        title: r.article_title || r.keyword,
        summary: `Quick lookup: ${r.keyword}`,
        group_code: r.group_code,
        group_name: r.group_name,
        subtype_code: r.subtype_code,
        score: 0.85,
      });
    }
  });

  // === 4. FULL-TEXT SEARCH ON TICKETS ===
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  const tsQuery = words.join(' & ');

  if (tsQuery) {
    const ticketFtResults = await query<{
      id: number; reference: string; summary: string;
      group_code: string; group_name: string;
      severity: string; priority: string; score: number;
    }>(`
      SELECT t.id, t.reference, t.summary,
             g.code as group_code, g.name as group_name,
             t.severity, t.priority,
             ts_rank_cd(t.search_vector, to_tsquery('english', $1)) as score
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE t.search_vector @@ to_tsquery('english', $1)
      ORDER BY score DESC
      LIMIT 20
    `, [tsQuery]);

    ticketFtResults.forEach(r => addResult({
      type: 'ticket',
      id: r.id,
      title: r.reference,
      summary: r.summary,
      group_code: r.group_code,
      group_name: r.group_name,
      severity: r.severity,
      priority: r.priority,
      score: Math.max(r.score * 0.7, 0.35),
    }));
  }

  // === 5. TRIGRAM SIMILARITY ON TICKETS (typo-tolerant) ===
  if (normalized.length >= 3) {
    const ticketTrigram = await query<{
      id: number; reference: string; summary: string;
      group_code: string; group_name: string;
      severity: string; priority: string; similarity: number;
    }>(`
      SELECT t.id, t.reference, t.summary,
             g.code as group_code, g.name as group_name,
             t.severity, t.priority,
             GREATEST(
               similarity(LOWER(t.reference), $1),
               similarity(LOWER(COALESCE(t.summary, '')), $1),
               similarity(LOWER(COALESCE(t.root_cause_category, '')), $1)
             ) as similarity
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE similarity(LOWER(t.reference), $1) > 0.1
         OR similarity(LOWER(COALESCE(t.summary, '')), $1) > 0.12
         OR similarity(LOWER(COALESCE(t.root_cause_category, '')), $1) > 0.15
      ORDER BY similarity DESC
      LIMIT 15
    `, [normalized]);

    ticketTrigram.forEach(r => addResult({
      type: 'ticket',
      id: r.id,
      title: r.reference,
      summary: r.summary,
      group_code: r.group_code,
      group_name: r.group_name,
      severity: r.severity,
      priority: r.priority,
      score: r.similarity * 0.6,
    }));
  }

  // === 6. ILIKE FALLBACK for typo tolerance (partial word matching) ===
  if (normalized.length >= 3 && !tsQuery.includes(' ')) {
    const likeResults = await query<{
      id: number; reference: string; summary: string;
      group_code: string; group_name: string;
      severity: string; priority: string;
    }>(`
      SELECT DISTINCT t.id, t.reference, t.summary,
             g.code as group_code, g.name as group_name,
             t.severity, t.priority
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE t.reference ILIKE '%' || $1 || '%'
         OR t.summary ILIKE '%' || $1 || '%'
         OR t.root_cause_category ILIKE '%' || $1 || '%'
         OR EXISTS (
           SELECT 1 FROM jsonb_each_text(t.custom_fields) kv
           WHERE kv.value ILIKE '%' || $1 || '%'
         )
      LIMIT 10
    `, [normalized]);

    likeResults.forEach(r => addResult({
      type: 'ticket',
      id: r.id,
      title: r.reference,
      summary: r.summary,
      group_code: r.group_code,
      group_name: r.group_name,
      severity: r.severity,
      priority: r.priority,
      score: 0.25, // Lower score for fuzzy ILIKE matches
    }));
  }

  // === 7. FULL-TEXT SEARCH ON KNOWLEDGE ARTICLES ===
  if (tsQuery) {
    const ftResults = await query<{
      id: number; title: string; symptoms: string;
      group_code: string; group_name: string; subtype_code: string;
      score: number;
    }>(`
      SELECT ka.id, ka.title, ka.symptoms,
             g.code as group_code, g.name as group_name, s.code as subtype_code,
             ts_rank_cd(ka.search_vector, to_tsquery('english', $1)) as score
      FROM knowledge_articles ka
      LEFT JOIN groups g ON ka.group_id = g.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      WHERE ka.search_vector @@ to_tsquery('english', $1)
        AND ka.status = 'published'
      ORDER BY score DESC
      LIMIT 20
    `, [tsQuery]);

    ftResults.forEach(r => addResult({
      type: 'knowledge',
      id: r.id,
      title: r.title,
      summary: r.symptoms,
      group_code: r.group_code,
      group_name: r.group_name,
      subtype_code: r.subtype_code,
      score: Math.max(r.score * 0.5, 0.25),
    }));
  }

  // === 8. TRIGRAM SIMILARITY ON KNOWLEDGE ARTICLES ===
  if (normalized.length >= 3) {
    const trigramResults = await query<{
      id: number; title: string; symptoms: string;
      group_code: string; group_name: string; subtype_code: string;
      similarity: number;
    }>(`
      SELECT ka.id, ka.title, ka.symptoms,
             g.code as group_code, g.name as group_name, s.code as subtype_code,
             GREATEST(
               similarity(LOWER(ka.title), $1),
               similarity(LOWER(COALESCE(ka.symptoms, '')), $1),
               similarity(LOWER(COALESCE(ka.root_cause, '')), $1)
             ) as similarity
      FROM knowledge_articles ka
      LEFT JOIN groups g ON ka.group_id = g.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      WHERE ka.status = 'published'
        AND (
          similarity(LOWER(ka.title), $1) > 0.15
          OR similarity(LOWER(COALESCE(ka.symptoms, '')), $1) > 0.12
          OR similarity(LOWER(COALESCE(ka.root_cause, '')), $1) > 0.12
        )
      ORDER BY similarity DESC
      LIMIT 15
    `, [normalized]);

    trigramResults.forEach(r => addResult({
      type: 'knowledge',
      id: r.id,
      title: r.title,
      summary: r.symptoms,
      group_code: r.group_code,
      group_name: r.group_name,
      subtype_code: r.subtype_code,
      score: r.similarity * 0.45,
    }));
  }

  // === 9. GROUP/SUBGROUP NAME MATCHING ===
  if (normalized.length >= 3) {
    const groupResults = await query<{
      article_id: number; title: string; symptoms: string;
      group_code: string; group_name: string; subtype_code: string;
      similarity: number;
    }>(`
      SELECT ka.id as article_id, ka.title, ka.symptoms,
             g.code as group_code, g.name as group_name, s.code as subtype_code,
             GREATEST(
               similarity(LOWER(g.name), $1),
               similarity(LOWER(s.name), $1)
             ) as similarity
      FROM knowledge_articles ka
      LEFT JOIN groups g ON ka.group_id = g.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      WHERE ka.status = 'published'
        AND (
          similarity(LOWER(g.name), $1) > 0.3
          OR similarity(LOWER(s.name), $1) > 0.3
        )
      ORDER BY similarity DESC
      LIMIT 10
    `, [normalized]);

    groupResults.forEach(r => addResult({
      type: 'knowledge',
      id: r.article_id,
      title: r.title,
      summary: r.symptoms,
      group_code: r.group_code,
      group_name: r.group_name,
      subtype_code: r.subtype_code,
      score: r.similarity * 0.4,
    }));
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

  // === Sort (default: relevance = score desc) ===
  const sort = filters.sort || 'relevance';
  switch (sort) {
    case 'priority': {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => (priorityOrder[a.priority || ''] ?? 4) - (priorityOrder[b.priority || ''] ?? 4));
      break;
    }
    default:
      filtered.sort((a, b) => b.score - a.score);
  }

  return { results: filtered, total: filtered.length };
}
