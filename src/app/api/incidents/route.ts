import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requirePermission, auditLog, validateRequired } from '@/lib/api-auth';
import { getKnowledgeCategory } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const group = searchParams.get('group');
  const subgroup = searchParams.get('subgroup');
  const search = searchParams.get('search');
  const priority = searchParams.get('priority');
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const assignedTo = searchParams.get('assigned_to');
  const temenosStatus = searchParams.get('temenos_status');
  const sort = searchParams.get('sort') || 'created_at_ticket';
  const order = searchParams.get('order') || 'DESC';
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (group) {
      conditions.push(`UPPER(g.code) = UPPER($${paramIdx++})`);
      params.push(group);
    }
    if (search && search.trim()) {
      const q = search.trim();
      conditions.push(`(
        t.reference ILIKE $${paramIdx}
        OR t.summary ILIKE $${paramIdx}
        OR t.root_cause ILIKE $${paramIdx}
        OR t.immediate_fix ILIKE $${paramIdx}
        OR t.permanent_fix ILIKE $${paramIdx}
        OR t.problem_symptoms ILIKE $${paramIdx}
        OR t.verification ILIKE $${paramIdx}
        OR t.notes ILIKE $${paramIdx}
        OR t.root_cause_category ILIKE $${paramIdx}
      )`);
      params.push(`%${q}%`);
      paramIdx++;
    }
    if (subgroup) {
      conditions.push(`t.subgroup_id = $${paramIdx++}`);
      params.push(parseInt(subgroup));
    }
    if (priority) {
      conditions.push(`LOWER(t.priority) = LOWER($${paramIdx++})`);
      params.push(priority);
    }
    if (severity) {
      conditions.push(`LOWER(t.severity) LIKE LOWER($${paramIdx++})`);
      params.push(`%${severity}%`);
    }
    if (status) {
      conditions.push(`LOWER(t.status) LIKE LOWER($${paramIdx++})`);
      params.push(`%${status}%`);
    }
    if (assignedTo) {
      conditions.push(`t.assigned_to = $${paramIdx++}`);
      params.push(parseInt(assignedTo));
    }
    if (temenosStatus) {
      conditions.push(`LOWER(t.temenos_status) LIKE LOWER($${paramIdx++})`);
      params.push(`%${temenosStatus}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const validSorts = ['created_at_ticket', 'reference', 'priority', 'severity', 'updated_at'];
    let sortClause = 'ORDER BY t.created_at_ticket DESC NULLS LAST';
    if (search && search.trim() && (!searchParams.get('sort') || searchParams.get('sort') === 'relevance')) {
      sortClause = `ORDER BY (
        CASE
          WHEN UPPER(t.reference) = UPPER('${search.trim().replace(/'/g, "''")}') THEN 1000
          WHEN UPPER(t.reference) LIKE '%${search.trim().toUpperCase().replace(/'/g, "''")}%' THEN 800
          WHEN LOWER(t.summary) ILIKE '%${search.trim().toLowerCase().replace(/'/g, "''")}%' THEN 600
          WHEN LOWER(t.immediate_fix) ILIKE '%${search.trim().toLowerCase().replace(/'/g, "''")}%' OR LOWER(t.permanent_fix) ILIKE '%${search.trim().toLowerCase().replace(/'/g, "''")}%' THEN 500
          WHEN LOWER(t.root_cause) ILIKE '%${search.trim().toLowerCase().replace(/'/g, "''")}%' THEN 400
          ELSE 200
        END *
        CASE
          WHEN (t.immediate_fix IS NOT NULL OR t.permanent_fix IS NOT NULL) AND (t.problem_symptoms IS NOT NULL OR t.root_cause IS NOT NULL OR t.verification IS NOT NULL) THEN 1.4
          WHEN (t.immediate_fix IS NOT NULL OR t.permanent_fix IS NOT NULL OR t.root_cause IS NOT NULL OR t.problem_symptoms IS NOT NULL) THEN 1.15
          ELSE 1.0
        END
      ) DESC, t.created_at_ticket DESC`;
    } else if (validSorts.includes(sort)) {
      const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      sortClause = `ORDER BY t.${sort} ${sortOrder} NULLS LAST`;
    }

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM tickets t LEFT JOIN groups g ON t.group_id = g.id ${where}`,
      params
    );

    const ticketsRaw = await query<any>(
      `SELECT t.id, t.reference, t.summary, t.status, t.requester, t.created_at_ticket,
              t.resolved_at, t.permanently_closed_at, t.root_cause_category,
              t.priority, t.severity, t.group_id, t.subgroup_id,
              t.assigned_to, t.internal_owner, t.temenos_status, t.follow_up_date,
              t.problem_symptoms, t.root_cause, t.immediate_fix, t.permanent_fix,
              t.verification, t.notes,
              g.code as group_code, g.name as group_name,
              s.name as subgroup_name, s.code as subgroup_code,
              u.name as assigned_to_name
       FROM tickets t
       LEFT JOIN groups g ON t.group_id = g.id
       LEFT JOIN subtypes s ON t.subgroup_id = s.id
       LEFT JOIN users u ON t.assigned_to = u.id
       ${where}
       ${sortClause}
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    const tickets = ticketsRaw.map((t) => {
      const { category, completeness, hasProblem, hasRootCause, hasSolution, hasVerification, hasNotes } = getKnowledgeCategory(t);

      let solutionPreview: string | null = null;
      if (hasSolution) {
        const solRaw = (t.immediate_fix || t.permanent_fix || '').replace(/<[^>]*>/g, '').trim();
        solutionPreview = solRaw.length > 150 ? solRaw.substring(0, 147) + '...' : solRaw;
      }

      let matchReasonLabel: string | undefined;
      if (search && search.trim()) {
        const qLower = search.trim().toLowerCase();
        if (t.reference.toLowerCase() === qLower) matchReasonLabel = '✓ Exact Match';
        else if (t.summary && t.summary.toLowerCase().includes(qLower)) matchReasonLabel = '↗ Title Match';
        else if ((t.immediate_fix && t.immediate_fix.toLowerCase().includes(qLower)) || (t.permanent_fix && t.permanent_fix.toLowerCase().includes(qLower))) matchReasonLabel = '↗ Related Solution';
        else if (t.root_cause && t.root_cause.toLowerCase().includes(qLower)) matchReasonLabel = '↗ Related Root Cause';
        else if (t.problem_symptoms && t.problem_symptoms.toLowerCase().includes(qLower)) matchReasonLabel = '↗ Related Problem';
        else matchReasonLabel = '↗ Related Knowledge';
      }

      return {
        ...t,
        knowledge_completeness: completeness,
        knowledge_category: category,
        has_problem: hasProblem,
        has_root_cause: hasRootCause,
        has_solution: hasSolution,
        has_verification: hasVerification,
        has_notes: hasNotes,
        solution_preview: solutionPreview,
        match_reason_label: matchReasonLabel,
      };
    });

    return NextResponse.json({
      tickets,
      total: parseInt(countResult?.count || '0'),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult?.count || '0') / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'incident.create');
  if (auth.error) return auth.error;

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

    const refError = validateRequired(reference, 'Reference', 50);
    if (refError) return NextResponse.json({ error: refError }, { status: 400 });

    const summaryError = validateRequired(summary, 'Summary', 2000);
    if (summaryError) return NextResponse.json({ error: summaryError }, { status: 400 });

    if (!group_id) {
      return NextResponse.json({ error: 'Group is required' }, { status: 400 });
    }

    // Check for duplicate reference
    const existing = await queryOne(
      'SELECT id FROM tickets WHERE UPPER(reference) = UPPER($1)',
      [reference]
    );
    if (existing) {
      return NextResponse.json(
        { error: `Incident ${reference} already exists` },
        { status: 409 }
      );
    }

    let ownerName = internal_owner || null;
    if (assigned_to && !ownerName) {
      const u = await queryOne<{ name: string }>('SELECT name FROM users WHERE id = $1', [assigned_to]);
      if (u) ownerName = u.name;
    }

    const initialStatus = status || 'new';

    const result = await queryOne<{ id: number }>(`
      INSERT INTO tickets
        (reference, summary, group_id, subgroup_id, priority, severity, status,
         root_cause_category, requester, custom_fields,
         assigned_to, internal_owner, temenos_status, temenos_response_date, follow_up_date, temenos_reported_date,
         problem_symptoms, root_cause, diagnostic_information,
         immediate_fix, permanent_fix, prevention, verification,
         temenos_contact, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16,
              $17, $18, $19, $20, $21, $22, $23,
              $24, $25)
      RETURNING id
    `, [
      reference.trim(), summary.trim(), group_id, subgroup_id || null,
      priority || 'Medium', severity || 'Medium', initialStatus,
      root_cause_category || null, requester || null,
      JSON.stringify(dynamic_fields || {}),
      assigned_to || null, ownerName, temenos_status || null,
      temenos_response_date || null, follow_up_date || null, temenos_reported_date || null,
      problem_symptoms || null, root_cause || null, diagnostic_information || null,
      immediate_fix || null, permanent_fix || null, prevention || null,
      verification || null, temenos_contact || null, notes || null,
    ]);

    if (!result) {
      return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
    }

    // Record initial status in incident_history if available
    try {
      await query(`
        INSERT INTO incident_history (ticket_id, changed_by, old_status, new_status, action_type, notes)
        VALUES ($1, $2, NULL, $3, 'status_change', 'Registered incident')
      `, [result.id, auth.user.userId, initialStatus]);
    } catch {
      // Ignored if table not migrated yet
    }

    // Audit log
    await auditLog({
      userId: auth.user.userId,
      action: 'incident.create',
      entityType: 'incident',
      entityId: result.id,
      details: `Registered incident ${reference} [Status: ${initialStatus}, Owner: ${ownerName || 'None'}]`,
    });

    return NextResponse.json({ id: result.id, message: 'Incident registered successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
