import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleanId = id?.trim();

  if (!cleanId) {
    return NextResponse.json({ error: 'Incident ID is required' }, { status: 400 });
  }

  try {
    const baseQuery = `
      SELECT t.*, 
             g.code as group_code, g.name as group_name, g.description as group_description,
             s.name as subgroup_name, s.code as subgroup_code, s.description as subgroup_description,
             u.name as assigned_to_name, u.email as assigned_to_email
      FROM tickets t
      LEFT JOIN groups g ON t.group_id = g.id
      LEFT JOIN subtypes s ON t.subgroup_id = s.id
      LEFT JOIN users u ON t.assigned_to = u.id
    `;

    // Try by reference first (exact match, case-insensitive, trimmed)
    let ticket = await queryOne(`
      ${baseQuery}
      WHERE TRIM(UPPER(t.reference)) = TRIM(UPPER($1))
    `, [cleanId]);

    // Try by numeric ID
    if (!ticket) {
      const numericId = parseInt(cleanId);
      if (!isNaN(numericId)) {
        ticket = await queryOne(`
          ${baseQuery}
          WHERE t.id = $1
        `, [numericId]);
      }
    }

    // Try partial reference match (e.g., "3183311" matches "TSR-3183311")
    if (!ticket) {
      ticket = await queryOne(`
        ${baseQuery}
        WHERE t.reference ILIKE '%' || $1 || '%'
        ORDER BY t.id
        LIMIT 1
      `, [cleanId]);
    }

    if (!ticket) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // PRIORITY 1: Incident-specific knowledge (directly linked)
    const directlyLinkedArticles = await query(`
      SELECT ka.id, ka.title, ka.status, ka.symptoms, ka.root_cause,
             ka.diagnostic_data, ka.immediate_fix, ka.permanent_fix,
             ka.prevention, ka.verification,
             s.code as subtype_code, s.name as subtype_name,
             g.code as group_code, g.name as group_name
      FROM ticket_articles ta
      JOIN knowledge_articles ka ON ta.article_id = ka.id
      LEFT JOIN subtypes s ON ka.subtype_id = s.id
      LEFT JOIN groups g ON ka.group_id = g.id
      WHERE ta.ticket_id = $1
      ORDER BY ka.title
    `, [ticket.id]);

    // PRIORITY 2: Subgroup knowledge base
    let subgroupArticles: any[] = [];
    if (ticket.subgroup_id) {
      subgroupArticles = await query(`
        SELECT ka.id, ka.title, ka.status, ka.symptoms, ka.root_cause,
                ka.diagnostic_data, ka.immediate_fix, ka.permanent_fix,
                ka.prevention, ka.verification,
                s.code as subtype_code, s.name as subtype_name,
                g.code as group_code, g.name as group_name
        FROM knowledge_articles ka
        LEFT JOIN subtypes s ON ka.subtype_id = s.id
        LEFT JOIN groups g ON ka.group_id = g.id
        WHERE ka.subtype_id = $1
          AND ka.status IN ('approved', 'published')
          AND ka.id NOT IN (SELECT article_id FROM ticket_articles WHERE ticket_id = $2)
        ORDER BY ka.title
      `, [ticket.subgroup_id, ticket.id]);
    }

    // PRIORITY 3: Group knowledge base
    let groupArticles: any[] = [];
    if (ticket.group_id) {
      groupArticles = await query(`
        SELECT ka.id, ka.title, ka.status, ka.symptoms, ka.root_cause,
                ka.diagnostic_data, ka.immediate_fix, ka.permanent_fix,
                ka.prevention, ka.verification,
                s.code as subtype_code, s.name as subtype_name,
                g.code as group_code, g.name as group_name
        FROM knowledge_articles ka
        LEFT JOIN subtypes s ON ka.subtype_id = s.id
        LEFT JOIN groups g ON ka.group_id = g.id
        WHERE ka.group_id = $1
          AND ka.status IN ('approved', 'published')
          AND ka.id NOT IN (SELECT article_id FROM ticket_articles WHERE ticket_id = $2)
          AND (ka.subtype_id IS NULL OR ka.subtype_id != $3)
        ORDER BY ka.title
        LIMIT 5
      `, [ticket.group_id, ticket.id, ticket.subgroup_id || 0]);
    }

    // PRIORITY 4: Similar incidents
    const similarIncidents = await query(`
      SELECT * FROM (
        SELECT t.id, t.reference, t.summary, t.priority, t.severity,
               g.code as group_code, g.name as group_name,
               s.name as subgroup_name,
               CASE
                 WHEN t.id = $1 THEN 0
                 ELSE GREATEST(
                   CASE WHEN t.group_id = $2 THEN 0.3 ELSE 0 END,
                   CASE WHEN LOWER(COALESCE(t.root_cause_category, '')) = LOWER(COALESCE((SELECT root_cause_category FROM tickets WHERE id = $1), ''))
                        AND t.root_cause_category IS NOT NULL THEN 0.3 ELSE 0 END,
                   similarity(LOWER(COALESCE(t.summary, '')),
                              LOWER(COALESCE((SELECT summary FROM tickets WHERE id = $1), '')))
                 )
               END as similarity_score
        FROM tickets t
        LEFT JOIN groups g ON t.group_id = g.id
        LEFT JOIN subtypes s ON t.subgroup_id = s.id
        WHERE t.id != $1
          AND (
            t.group_id = $2
            OR LOWER(COALESCE(t.root_cause_category, '')) = LOWER(COALESCE((SELECT root_cause_category FROM tickets WHERE id = $1), ''))
            OR similarity(LOWER(COALESCE(t.summary, '')),
                          LOWER(COALESCE((SELECT summary FROM tickets WHERE id = $1), ''))) > 0.1
          )
      ) sub
      WHERE sub.similarity_score > 0.1
      ORDER BY sub.similarity_score DESC
      LIMIT 5
    `, [ticket.id, ticket.group_id || 0]);

    // Subgroup-related incidents
    let subgroupIncidents: any[] = [];
    if (ticket.subgroup_id) {
      subgroupIncidents = await query(`
        SELECT t.id, t.reference, t.summary
        FROM tickets t
        WHERE t.subgroup_id = $1 AND t.id != $2
        ORDER BY t.created_at_ticket DESC NULLS LAST
        LIMIT 5
      `, [ticket.subgroup_id, ticket.id]);
    }

    // Incident status and assignment history
    let history: any[] = [];
    try {
      history = await query(`
        SELECT ih.*, u.name as changed_by_name, u.email as changed_by_email
        FROM incident_history ih
        LEFT JOIN users u ON ih.changed_by = u.id
        WHERE ih.ticket_id = $1
        ORDER BY ih.created_at DESC
      `, [ticket.id]);
    } catch {
      history = [];
    }

    return NextResponse.json({
      ...ticket,
      directly_linked_articles: directlyLinkedArticles,
      subgroup_articles: subgroupArticles,
      group_articles: groupArticles,
      similar_incidents: similarIncidents,
      subgroup_incidents: subgroupIncidents,
      history,
    });
  } catch (error: any) {
    console.error('Incident lookup error:', error);
    return NextResponse.json({ error: 'Unable to load incident. Please try again.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'incident.edit');
  if (auth.error) return auth.error;

  const { id } = await params;
  const cleanId = id?.trim();

  try {
    const body = await request.json();
    const {
      reference, summary, group_id, subgroup_id, priority, severity, status,
      root_cause_category, requester, dynamic_fields,
      assigned_to, internal_owner, temenos_status, temenos_response_date, follow_up_date, temenos_reported_date,
      problem_symptoms, root_cause, diagnostic_information,
      immediate_fix, permanent_fix, prevention, verification,
      temenos_contact, notes,
    } = body;

    let ticketId: number | null = null;
    const byRef = await queryOne(
      'SELECT id, status FROM tickets WHERE TRIM(UPPER(reference)) = TRIM(UPPER($1))',
      [cleanId]
    );
    if (byRef) {
      ticketId = byRef.id;
    } else {
      const numericId = parseInt(cleanId);
      if (!isNaN(numericId)) {
        const byId = await queryOne('SELECT id, status FROM tickets WHERE id = $1', [numericId]);
        if (byId) ticketId = byId.id;
      }
    }

    if (!ticketId) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    // Check reference uniqueness if changed
    if (reference) {
      const dup = await queryOne(
        'SELECT id FROM tickets WHERE UPPER(reference) = UPPER($1) AND id != $2',
        [reference, ticketId]
      );
      if (dup) {
        return NextResponse.json({ error: `Reference ${reference} already exists` }, { status: 409 });
      }
    }

    await queryOne(`
      UPDATE tickets SET
        reference = COALESCE($1, reference),
        summary = COALESCE($2, summary),
        group_id = COALESCE($3, group_id),
        subgroup_id = $4,
        priority = COALESCE($5, priority),
        severity = COALESCE($6, severity),
        status = COALESCE($7, status),
        root_cause_category = COALESCE($8, root_cause_category),
        requester = COALESCE($9, requester),
        custom_fields = COALESCE($10, custom_fields),
        assigned_to = COALESCE($11, assigned_to),
        internal_owner = COALESCE($12, internal_owner),
        temenos_status = COALESCE($13, temenos_status),
        temenos_response_date = COALESCE($14, temenos_response_date),
        follow_up_date = COALESCE($15, follow_up_date),
        temenos_reported_date = COALESCE($16, temenos_reported_date),
        problem_symptoms = $17,
        root_cause = $18,
        diagnostic_information = $19,
        immediate_fix = $20,
        permanent_fix = $21,
        prevention = $22,
        verification = $23,
        temenos_contact = $24,
        notes = $25,
        updated_at = NOW()
      WHERE id = $26
    `, [
      reference || null, summary || null, group_id || null,
      subgroup_id !== undefined ? subgroup_id : null,
      priority || null, severity || null, status || null,
      root_cause_category || null, requester || null,
      dynamic_fields ? JSON.stringify(dynamic_fields) : null,
      assigned_to !== undefined ? assigned_to : null,
      internal_owner !== undefined ? internal_owner : null,
      temenos_status !== undefined ? temenos_status : null,
      temenos_response_date || null,
      follow_up_date || null,
      temenos_reported_date || null,
      problem_symptoms !== undefined ? problem_symptoms : null,
      root_cause !== undefined ? root_cause : null,
      diagnostic_information !== undefined ? diagnostic_information : null,
      immediate_fix !== undefined ? immediate_fix : null,
      permanent_fix !== undefined ? permanent_fix : null,
      prevention !== undefined ? prevention : null,
      verification !== undefined ? verification : null,
      temenos_contact !== undefined ? temenos_contact : null,
      notes !== undefined ? notes : null,
      ticketId,
    ]);

    await auditLog({
      userId: auth.user.userId,
      action: 'incident.update',
      entityType: 'incident',
      entityId: ticketId,
      details: `Updated incident ${reference || cleanId}`,
    });

    return NextResponse.json({ message: 'Incident updated successfully' });
  } catch (error: any) {
    console.error('Incident update error:', error);
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
}
