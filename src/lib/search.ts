import { query } from './db';
import type { SearchResult, SearchFilters } from './types';

/**
 * Check if a string contains real, meaningful content (ignoring HTML, whitespace, and placeholders).
 */
export function hasMeaningfulContent(text: string | null | undefined): boolean {
  if (!text) return false;
  const cleaned = text
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|amp|quot|lt|gt);/g, ' ')
    .trim();
  if (cleaned.length < 3) return false;
  const lower = cleaned.toLowerCase();
  const placeholders = ['n/a', 'na', 'none', 'not provided', 'nil', 'null', 'no', '-'];
  return !placeholders.includes(lower);
}

/**
 * Determine knowledge completeness level for an incident or article.
 */
export function getKnowledgeCompleteness(item: {
  problem_symptoms?: string | null;
  root_cause?: string | null;
  immediate_fix?: string | null;
  permanent_fix?: string | null;
  verification?: string | null;
  notes?: string | null;
}): 'full' | 'partial' | 'none' {
  const hasProblem = hasMeaningfulContent(item.problem_symptoms);
  const hasRootCause = hasMeaningfulContent(item.root_cause);
  const hasSolution = hasMeaningfulContent(item.immediate_fix) || hasMeaningfulContent(item.permanent_fix);
  const hasVerification = hasMeaningfulContent(item.verification);
  const hasNotes = hasMeaningfulContent(item.notes);

  if (hasSolution && (hasProblem || hasRootCause || hasVerification)) {
    return 'full';
  }
  if (hasRootCause && hasSolution) {
    return 'full';
  }
  if (hasSolution || hasRootCause || hasProblem || hasVerification || hasNotes) {
    return 'partial';
  }
  return 'none';
}

/**
 * Get clean human-readable UI label for match reasons.
 */
export function getMatchReasonLabel(reason: string): string {
  switch (reason) {
    case 'EXACT_REFERENCE':
      return '✓ Exact Match';
    case 'EXACT_TITLE':
      return '✓ Exact Title';
    case 'TITLE_MATCH':
      return '↗ Title Match';
    case 'SOLUTION_MATCH':
      return '↗ Related Solution';
    case 'ROOT_CAUSE_MATCH':
      return '↗ Related Root Cause';
    case 'PROBLEM_MATCH':
      return '↗ Related Problem';
    case 'VERIFICATION_MATCH':
      return '↗ Related Verification';
    case 'NOTES_MATCH':
      return '↗ Related Notes';
    case 'GROUP_MATCH':
      return '↗ Related Group';
    case 'SUBGROUP_MATCH':
      return '↗ Related Subgroup';
    default:
      return '↗ Related Knowledge';
  }
}

/**
 * Normalize search query for better matching.
 */
function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[-_.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/["''`]/g, '')
    .trim();
}

/**
 * Extract a concise snippet around matched query words.
 */
function createSnippet(field: string, text: string | null | undefined, q: string): { field: string; text: string } | undefined {
  if (!text || !hasMeaningfulContent(text)) return undefined;

  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;

  const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  let bestPos = -1;

  for (const word of words) {
    const pos = cleaned.toLowerCase().indexOf(word);
    if (pos !== -1) {
      bestPos = pos;
      break;
    }
  }

  if (bestPos === -1) {
    const snippetText = cleaned.length > 140 ? cleaned.substring(0, 137) + '...' : cleaned;
    return { field, text: snippetText };
  }

  const start = Math.max(0, bestPos - 30);
  const end = Math.min(cleaned.length, bestPos + 110);
  let snippetText = cleaned.substring(start, end);
  if (start > 0) snippetText = '...' + snippetText;
  if (end < cleaned.length) snippetText = snippetText + '...';

  return { field, text: snippetText };
}

/**
 * Enhanced Search across knowledge articles and tickets.
 *
 * Prioritizes:
 * 1. Exact Reference Match (highest)
 * 2. Exact Title Match
 * 3. Title / Summary Relevance
 * 4. Knowledge Content Match (Solution, Root Cause, Problem, Verification, Notes)
 * 5. Knowledge Completeness Boost (Full +40%, Partial +15%)
 * 6. Typo Tolerance / Fuzzy Match
 */
export async function search(
  rawQuery: string,
  filters: SearchFilters = {}
): Promise<{ results: SearchResult[]; total: number }> {
  const normalized = normalizeQuery(rawQuery);
  if (!normalized) return { results: [], total: 0 };

  const rawTrimmed = rawQuery.trim();
  const searchMap = new Map<string, SearchResult>();

  function addOrUpdateResult(candidate: SearchResult) {
    const key = `${candidate.type}:${candidate.id}`;
    const existing = searchMap.get(key);
    if (!existing || candidate.score > existing.score) {
      searchMap.set(key, candidate);
    }
  }

  // Words for Full-Text Search
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  const tsQuery = words.join(' & ');

  // ============================================================
  // 1. TICKETS SEARCH & RANKING
  // ============================================================
  const ticketRows = await query<{
    id: number; reference: string; summary: string;
    group_code: string; group_name: string;
    subgroup_code: string; subgroup_name: string;
    severity: string; priority: string;
    problem_symptoms: string | null; root_cause: string | null;
    immediate_fix: string | null; permanent_fix: string | null;
    verification: string | null; notes: string | null;
    created_at_ticket: string | null; root_cause_category: string | null;
    ft_rank: number; ref_sim: number; sum_sim: number;
    solution_sim: number; root_sim: number; prob_sim: number;
  }>(`
    SELECT t.id, t.reference, t.summary,
           g.code as group_code, g.name as group_name,
           s.code as subgroup_code, s.name as subgroup_name,
           t.severity, t.priority,
           t.problem_symptoms, t.root_cause,
           t.immediate_fix, t.permanent_fix,
           t.verification, t.notes,
           t.created_at_ticket, t.root_cause_category,
           COALESCE(ts_rank_cd(t.search_vector, to_tsquery('english', $2)), 0) as ft_rank,
           similarity(LOWER(t.reference), $1) as ref_sim,
           similarity(LOWER(COALESCE(t.summary, '')), $1) as sum_sim,
           GREATEST(
             similarity(LOWER(COALESCE(t.immediate_fix, '')), $1),
             similarity(LOWER(COALESCE(t.permanent_fix, '')), $1)
           ) as solution_sim,
           similarity(LOWER(COALESCE(t.root_cause, '')), $1) as root_sim,
           similarity(LOWER(COALESCE(t.problem_symptoms, '')), $1) as prob_sim
    FROM tickets t
    LEFT JOIN groups g ON t.group_id = g.id
    LEFT JOIN subtypes s ON t.subgroup_id = s.id
    WHERE UPPER(t.reference) = UPPER($3)
       OR UPPER(t.reference) = UPPER($4)
       OR t.reference ILIKE '%' || $3 || '%'
       OR t.summary ILIKE '%' || $1 || '%'
       OR ($2 != '' AND t.search_vector @@ to_tsquery('english', $2))
       OR similarity(LOWER(t.reference), $1) > 0.15
       OR similarity(LOWER(COALESCE(t.summary, '')), $1) > 0.12
       OR similarity(LOWER(COALESCE(t.root_cause, '')), $1) > 0.12
       OR similarity(LOWER(COALESCE(t.immediate_fix, '')), $1) > 0.12
       OR similarity(LOWER(COALESCE(t.problem_symptoms, '')), $1) > 0.12
    LIMIT 50
  `, [
    normalized,
    tsQuery ? tsQuery : '',
    rawTrimmed,
    `TSR-${rawTrimmed}`,
  ]);

  for (const t of ticketRows) {
    const completeness = getKnowledgeCompleteness(t);
    let baseScore = 0;
    let matchReason: SearchResult['match_reason'] = 'RELATED_KNOWLEDGE';
    let snippet: SearchResult['snippet'];

    const refUpper = t.reference.toUpperCase().trim();
    const qUpper = rawTrimmed.toUpperCase().trim();
    const tsrUpper = `TSR-${qUpper}`;

    // Priority 1: Exact Reference Match
    if (refUpper === qUpper || refUpper === tsrUpper) {
      baseScore = 100;
      matchReason = 'EXACT_REFERENCE';
    }
    // Priority 2: Exact Title Match
    else if (t.summary && t.summary.toLowerCase().trim() === normalized) {
      baseScore = 90;
      matchReason = 'EXACT_TITLE';
    }
    // Priority 3: Partial Reference Match
    else if (t.reference.toLowerCase().includes(normalized) || t.ref_sim > 0.3) {
      baseScore = 75 + (t.ref_sim * 10);
      matchReason = 'EXACT_REFERENCE';
    }
    // Priority 4: Solution Match
    else if (
      (t.immediate_fix && t.immediate_fix.toLowerCase().includes(normalized)) ||
      (t.permanent_fix && t.permanent_fix.toLowerCase().includes(normalized)) ||
      t.solution_sim > 0.25
    ) {
      baseScore = 65 + (t.solution_sim * 15) + (t.ft_rank * 10);
      matchReason = 'SOLUTION_MATCH';
      snippet = createSnippet('Solution / Fix', t.immediate_fix || t.permanent_fix, normalized);
    }
    // Priority 5: Root Cause Match
    else if ((t.root_cause && t.root_cause.toLowerCase().includes(normalized)) || t.root_sim > 0.25) {
      baseScore = 60 + (t.root_sim * 15) + (t.ft_rank * 10);
      matchReason = 'ROOT_CAUSE_MATCH';
      snippet = createSnippet('Root Cause', t.root_cause, normalized);
    }
    // Priority 6: Problem / Title Match
    else if (
      (t.summary && t.summary.toLowerCase().includes(normalized)) ||
      (t.problem_symptoms && t.problem_symptoms.toLowerCase().includes(normalized)) ||
      t.sum_sim > 0.2 || t.prob_sim > 0.2
    ) {
      baseScore = 55 + (t.sum_sim * 15) + (t.ft_rank * 10);
      matchReason = t.summary && t.summary.toLowerCase().includes(normalized) ? 'TITLE_MATCH' : 'PROBLEM_MATCH';
      snippet = createSnippet('Problem / Symptoms', t.problem_symptoms || t.summary, normalized);
    }
    // Priority 7: Verification Match
    else if (t.verification && t.verification.toLowerCase().includes(normalized)) {
      baseScore = 45;
      matchReason = 'VERIFICATION_MATCH';
      snippet = createSnippet('Verification', t.verification, normalized);
    }
    // Priority 8: Notes Match
    else if (t.notes && t.notes.toLowerCase().includes(normalized)) {
      baseScore = 40;
      matchReason = 'NOTES_MATCH';
      snippet = createSnippet('Notes', t.notes, normalized);
    }
    // Fallback: Full-Text / Trigram Match
    else {
      baseScore = 30 + (t.ft_rank * 20);
      matchReason = 'RELATED_KNOWLEDGE';
    }

    // Default snippet if none created yet
    if (!snippet) {
      if (hasMeaningfulContent(t.immediate_fix || t.permanent_fix)) {
        snippet = createSnippet('Solution', t.immediate_fix || t.permanent_fix, normalized);
      } else if (hasMeaningfulContent(t.root_cause)) {
        snippet = createSnippet('Root Cause', t.root_cause, normalized);
      } else if (hasMeaningfulContent(t.problem_symptoms)) {
        snippet = createSnippet('Problem', t.problem_symptoms, normalized);
      }
    }

    // Apply Knowledge Completeness Multiplier
    // Full knowledge (solution + problem/root cause) gets +40% boost
    // Partial knowledge gets +15% boost
    let completenessMultiplier = 1.0;
    if (completeness === 'full') completenessMultiplier = 1.4;
    else if (completeness === 'partial') completenessMultiplier = 1.15;

    const finalScore = Number((baseScore * completenessMultiplier).toFixed(2));

    addOrUpdateResult({
      type: 'ticket',
      id: t.id,
      title: t.reference,
      summary: t.summary || '',
      group_code: t.group_code,
      group_name: t.group_name,
      subtype_code: t.subgroup_code,
      subgroup_name: t.subgroup_name,
      severity: t.severity,
      priority: t.priority,
      score: finalScore,
      knowledge_completeness: completeness,
      match_reason: matchReason,
      match_reason_label: getMatchReasonLabel(matchReason),
      snippet,
      created_at_ticket: t.created_at_ticket,
      problem_symptoms: t.problem_symptoms,
      root_cause: t.root_cause,
      immediate_fix: t.immediate_fix,
      permanent_fix: t.permanent_fix,
      verification: t.verification,
      notes: t.notes,
    });
  }

  // ============================================================
  // 2. KNOWLEDGE ARTICLES SEARCH & RANKING
  // ============================================================
  const articleRows = await query<{
    id: number; title: string; symptoms: string;
    group_code: string; group_name: string; subtype_code: string;
    root_cause: string; immediate_fix: string; permanent_fix: string;
    verification: string; notes: string; ft_rank: number;
  }>(`
    SELECT ka.id, ka.title, ka.symptoms,
           g.code as group_code, g.name as group_name, s.code as subtype_code,
           ka.root_cause, ka.immediate_fix, ka.permanent_fix, ka.verification, ka.notes,
           COALESCE(ts_rank_cd(ka.search_vector, to_tsquery('english', $2)), 0) as ft_rank
    FROM knowledge_articles ka
    LEFT JOIN groups g ON ka.group_id = g.id
    LEFT JOIN subtypes s ON ka.subtype_id = s.id
    WHERE ka.status = 'published'
      AND (
        ka.title ILIKE '%' || $1 || '%'
        OR ($2 != '' AND ka.search_vector @@ to_tsquery('english', $2))
        OR similarity(LOWER(ka.title), $1) > 0.15
        OR similarity(LOWER(COALESCE(ka.symptoms, '')), $1) > 0.12
        OR similarity(LOWER(COALESCE(ka.root_cause, '')), $1) > 0.12
      )
    LIMIT 25
  `, [normalized, tsQuery ? tsQuery : '']);

  for (const ka of articleRows) {
    const completeness = getKnowledgeCompleteness({
      problem_symptoms: ka.symptoms,
      root_cause: ka.root_cause,
      immediate_fix: ka.immediate_fix,
      permanent_fix: ka.permanent_fix,
      verification: ka.verification,
      notes: ka.notes,
    });

    let baseScore = 50 + (ka.ft_rank * 20);
    let matchReason: SearchResult['match_reason'] = 'RELATED_KNOWLEDGE';
    let snippet = createSnippet('Symptoms', ka.symptoms, normalized);

    if (ka.title.toLowerCase() === normalized) {
      baseScore = 90;
      matchReason = 'EXACT_TITLE';
    } else if (ka.title.toLowerCase().includes(normalized)) {
      baseScore = 70;
      matchReason = 'TITLE_MATCH';
    }

    let multiplier = 1.0;
    if (completeness === 'full') multiplier = 1.4;
    else if (completeness === 'partial') multiplier = 1.15;

    const finalScore = Number((baseScore * multiplier).toFixed(2));

    addOrUpdateResult({
      type: 'knowledge',
      id: ka.id,
      title: ka.title,
      summary: ka.symptoms || '',
      group_code: ka.group_code,
      group_name: ka.group_name,
      subtype_code: ka.subtype_code,
      score: finalScore,
      knowledge_completeness: completeness,
      match_reason: matchReason,
      match_reason_label: getMatchReasonLabel(matchReason),
      snippet,
    });
  }

  // ============================================================
  // 3. FILTERING & SORTING
  // ============================================================
  let results = Array.from(searchMap.values());

  if (filters.group) {
    results = results.filter(r => r.group_code?.toUpperCase() === filters.group!.toUpperCase());
  }
  if (filters.severity) {
    results = results.filter(r => r.severity?.toLowerCase().includes(filters.severity!.toLowerCase()));
  }
  if (filters.priority) {
    results = results.filter(r => r.priority?.toLowerCase() === filters.priority!.toLowerCase());
  }

  const sort = filters.sort || 'relevance';
  switch (sort) {
    case 'priority': {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      results.sort((a, b) => (priorityOrder[a.priority || ''] ?? 4) - (priorityOrder[b.priority || ''] ?? 4));
      break;
    }
    default:
      results.sort((a, b) => b.score - a.score);
  }

  return { results, total: results.length };
}
