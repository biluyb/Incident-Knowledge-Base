import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Try by reference first, then by ID
    let ticket = await queryOne(`
      SELECT t.*, g.code as group_code, g.name as group_name
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE UPPER(t.reference) = UPPER($1)
    `, [id]);

    if (!ticket) {
      ticket = await queryOne(`
        SELECT t.*, g.code as group_code, g.name as group_name
        FROM tickets t
        LEFT JOIN groups g ON t.group_id = g.id
        WHERE t.id = $1
      `, [parseInt(id) || 0]);
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Get related knowledge articles (SRS §24)
    const relatedArticles = await query(`
      SELECT ka.id, ka.title, ka.status, ka.symptoms, s.code as subtype_code,
             g.code as group_code, g.name as group_name
      FROM knowledge_articles ka
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      LEFT JOIN groups g ON ka.group_id = g.id
      WHERE (ka.group_id = $1 OR ka.subtype_id IN (
        SELECT s2.id FROM subtypes s2
        WHERE s2.group_id = $1
      ))
      AND ka.status = 'published'
      ORDER BY ka.title
      LIMIT 10
    `, [ticket.group_id]);

    // Get similar incidents (SRS §23)
    // Similarity based on: same group, same root cause category, trigram on summary
    const similarIncidents = await query(`
      SELECT t.id, t.reference, t.summary, t.priority, t.severity,
             g.code as group_code, g.name as group_name,
             CASE
               WHEN t.id = $2 THEN 0
               ELSE GREATEST(
                 CASE WHEN t.group_id = $3 AND $3 IS NOT NULL THEN 0.3 ELSE 0 END,
                 CASE WHEN LOWER(t.root_cause_category) = LOWER(COALESCE((SELECT root_cause_category FROM tickets WHERE id = $2), ''))
                      AND t.root_cause_category IS NOT NULL THEN 0.3 ELSE 0 END,
                 similarity(LOWER(COALESCE(t.summary, '')),
                            LOWER(COALESCE((SELECT summary FROM tickets WHERE id = $2), '')))
               )
             END as similarity_score
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      WHERE t.id != $2
        AND (
          t.group_id = $3
          OR LOWER(t.root_cause_category) = LOWER(COALESCE((SELECT root_cause_category FROM tickets WHERE id = $2), ''))
          OR similarity(LOWER(COALESCE(t.summary, '')),
                        LOWER(COALESCE((SELECT summary FROM tickets WHERE id = $2), ''))) > 0.1
        )
      HAVING GREATEST(
        CASE WHEN t.group_id = $3 AND $3 IS NOT NULL THEN 0.3 ELSE 0 END,
        CASE WHEN LOWER(t.root_cause_category) = LOWER(COALESCE((SELECT root_cause_category FROM tickets WHERE id = $2), ''))
             AND t.root_cause_category IS NOT NULL THEN 0.3 ELSE 0 END,
        similarity(LOWER(COALESCE(t.summary, '')),
                   LOWER(COALESCE((SELECT summary FROM tickets WHERE id = $2), '')))
      ) > 0.1
      ORDER BY similarity_score DESC
      LIMIT 5
    `, [ticket.id, ticket.id, ticket.group_id]);

    return NextResponse.json({
      ...ticket,
      related_articles: relatedArticles,
      similar_incidents: similarIncidents,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
