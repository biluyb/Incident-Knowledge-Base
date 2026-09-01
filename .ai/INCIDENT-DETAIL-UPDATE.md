# Incident Detail — Problem & Solution Structure Update

## Date: 2026-09-01

## 1. What Changed

Every incident now supports its own Problem & Solution knowledge structure
with 9 fields, independent of linked knowledge articles.

## 2. Database Changes

### New columns added to `tickets` table:

| Column | Type | Purpose |
|--------|------|---------|
| `problem_symptoms` | TEXT | Problem description and observed symptoms |
| `root_cause` | TEXT | Technical root cause analysis |
| `diagnostic_information` | TEXT | Commands, logs, or steps used to diagnose |
| `immediate_fix` | TEXT | Quick fix applied to resolve immediately |
| `permanent_fix` | TEXT | Permanent solution to prevent recurrence |
| `prevention` | TEXT | Steps to prevent this issue in the future |
| `verification` | TEXT | Steps to verify the fix is working |
| `temenos_contact` | TEXT | Temenos support contact for this issue |
| `notes` | TEXT | Additional notes and context |

### Migration file:
`scripts/migrate-incident-knowledge-fields.sql`

### Search vector updated:
The `update_ticket_search_vector()` function now includes the new fields
in full-text search, weighted by relevance (problem_symptoms and root_cause
at weight B, diagnostic/immediate_fix/permanent_fix at weight C).

## 3. API Changes

### POST /api/incidents (Create)
Now accepts all 9 knowledge fields:
- `problem_symptoms`, `root_cause`, `diagnostic_information`
- `immediate_fix`, `permanent_fix`, `prevention`, `verification`
- `temenos_contact`, `notes`

### PUT /api/incidents/:id (Update)
Now accepts all 9 knowledge fields.
Uses explicit `undefined` check to allow partial updates without clearing
existing values. Empty strings are preserved (user cleared the field).

### GET /api/incidents/:id (Read)
Automatically returns all new fields via `SELECT t.*`.

## 4. Form Changes

### New Incident Form
Two new sections added after Classification:
- **Problem & Solution** — 7 textareas (Problem/ Symptoms is required)
- **Additional Information** — Temenos Contact + Notes

### Edit Incident Form
Same two sections added, pre-populated with existing values.
All fields preserve unchanged values on save.

## 5. Detail Page Changes

Redesigned layout:
1. **Problem & Solution** — Primary section with all 7 knowledge fields
   - Diagnostic Information shown in monospace code block
   - Immediate Fix and Permanent Fix in green highlight boxes
   - Verification with interactive checkboxes
   - Empty fields show "Not provided" in italic
2. **Additional Information** — Temenos Contact + Notes (only shown if populated)
3. **Related Knowledge Base** — Linked articles as supplementary context
4. **Incident Details** — Metadata (status, dates, priority, etc.)
5. **Related Incidents** — Similar incidents
6. **Attachments** — File uploads

## 6. Validation Rules

- **Problem / Symptoms**: Required on create (backend validates)
- All other knowledge fields: Optional
- Empty strings allowed (means user cleared the field)
- Backend prevents partial update from clearing existing data

## 7. RBAC Behavior

- **Create**: Requires `incident.create` permission (Contributor+)
- **Edit**: Requires `incident.edit` permission (Contributor+)
- **Read**: Requires authentication (any role)
- Viewer can read but not create/edit

## 8. Data Safety

- Partial updates use `COALESCE` for base fields
- Knowledge fields use explicit `undefined` check to preserve values
- Existing historical data remains intact (new columns default to NULL)
- No existing data is modified or deleted

## 9. Files Changed

| File | Change |
|------|--------|
| `scripts/migrate-incident-knowledge-fields.sql` | NEW — Database migration |
| `src/lib/types.ts` | Added 9 fields to Ticket interface |
| `src/app/api/incidents/route.ts` | POST accepts new fields |
| `src/app/api/incidents/[id]/route.ts` | PUT accepts new fields |
| `src/app/incidents/new/page.tsx` | Problem & Solution form sections |
| `src/app/incidents/[id]/edit/page.tsx` | Problem & Solution form sections |
| `src/app/incidents/[id]/page.tsx` | Redesigned detail layout |

## 10. Remaining Issues

1. Search should eventually include problem_symptoms and root_cause
   in trigram indexes for typo-tolerant search
2. Knowledge articles could be auto-populated from incident fields
3. Consider adding required field validation for edit as well
