# TCSP Incident Knowledge Base

## 1. Project Purpose

This application is a **historical technical knowledge archive** for T24/Temenos incidents. It is NOT a ticket-management system.

When an engineer encounters a new technical problem, they:
1. Search for the problem
2. Find similar historical incidents
3. Read how the previous problem was diagnosed
4. Read the root cause and solution
5. Apply the solution to the current problem
6. Optionally document the newly solved incident for future reference

The system stores 237 previously solved incidents imported from an Excel workbook, classified into 8 technical domains with 30 subgroups using pre-classified data from Excel v4.

## 2. Core Workflow

```
NEW PROBLEM OCCURS
       ↓
Search (keyword, error, TSR, module, record)
       ↓
Find Similar Historical Incident
       ↓
Read: Problem → Root Cause → Diagnosis → Solution → Prevention → Verification
       ↓
Solve Current Problem
       ↓
Document Historical Incident (+ Add Incident)
```

## 3. Product Principles

- **Search first** — the homepage is a search box
- **Fast navigation** — minimal clicks to reach a solution
- **Historical knowledge, not ticket tracking** — no "My Open Tickets", no SLA, no workflow
- **Preserve historical information** — never silently delete incidents
- **Avoid unnecessary complexity** — no Elasticsearch, Redis, AI, microservices
- **Simple maintainable solutions** — Next.js + PostgreSQL + Tailwind
- **Data-driven** — groups, subtypes, keywords are database records, not hardcoded
- **Knowledge over incident management** — "Learn from the ticket, don't manage the ticket"

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.3.1, React 19, TypeScript 5, Tailwind CSS 4 |
| Backend | Next.js API Routes (App Router) |
| Database | PostgreSQL 16 (with pg_trgm, uuid-ossp extensions) |
| ORM | None — raw SQL via `pg` driver |
| Search | PostgreSQL Full-Text Search + pg_trgm trigram similarity |
| Excel Import | xlsx library |
| Dev/Build | tsx (TypeScript execution), Turbopack |
| Deployment | Local Linux (Docker-ready) |

## 5. Architecture

```
src/
├── app/
│   ├── page.tsx                  # Home (search-focused)
│   ├── layout.tsx                # Root layout + sidebar nav
│   ├── globals.css               # Tailwind imports
│   ├── search/page.tsx           # Search results page
│   ├── incidents/page.tsx        # Incident list (paginated)
│   ├── incidents/[id]/page.tsx   # Incident detail (SRS §15, §23, §24)
│   ├── groups/page.tsx           # Browse groups
│   ├── groups/[code]/page.tsx    # Group detail (subtypes, tickets, articles, keywords)
│   ├── knowledge/page.tsx        # Knowledge articles list
│   ├── knowledge/[id]/page.tsx   # Knowledge article detail (SRS §16)
│   ├── knowledge/new/page.tsx    # Add knowledge article form
│   ├── quick-lookup/page.tsx     # Keyword → Group mapping browser
│   └── api/
│       ├── search/route.ts       # GET /api/search?q=...
│       ├── incidents/route.ts    # GET /api/incidents (paginated, filtered)
│       ├── incidents/[id]/route.ts # GET /api/incidents/:id (with similar + related)
│       ├── knowledge/route.ts    # GET /api/knowledge, POST /api/knowledge
│       ├── knowledge/[id]/route.ts # GET /api/knowledge/:id
│       ├── groups/route.ts       # GET /api/groups (with counts)
│       ├── groups/[id]/route.ts  # GET /api/groups/:id (with subtypes, tickets, articles, keywords)
│       ├── keywords/route.ts     # GET /api/keywords
│       └── stats/route.ts        # GET /api/stats (dashboard data)
├── components/
│   ├── Navigation.tsx            # Sidebar navigation
│   └── ui/
│       ├── Badge.tsx             # Colored badge component
│       ├── CopyButton.tsx        # Clipboard copy button
│       ├── SearchBox.tsx         # Search input form
│       └── StatCard.tsx          # Statistics card
├── lib/
│   ├── db.ts                     # PostgreSQL connection pool + query helpers
│   ├── search.ts                 # Multi-strategy search engine
│   └── types.ts                  # TypeScript interfaces
scripts/
├── schema.sql                    # Full PostgreSQL schema
├── import-xlsx.ts                # Excel import script (all 4 sheets)
└── examine-excel.ts              # (deleted — was temporary)
```

## 6. Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|---|---|---|
| `groups` | 8 incident domains (G01-G08) | code, name, description, legacy_code |
| `subtypes` | 30 subgroups within groups | code, name, description, group_id |
| `tickets` | Historical incidents (237 records) | reference, summary, status, requester, priority, severity, group_id, subgroup_id, classification_confidence, legacy_group, custom_fields, search_vector |
| `knowledge_articles` | Reusable solutions (9 from subtypes) | title, symptoms, root_cause, diagnostic_data, immediate_fix, permanent_fix, prevention, verification, group_id, subtype_id, status |
| `keywords` | Quick lookup terms (87) | keyword, group_id, weight |
| `references_table` | External links (21) | title, url, reference_type, article_id |
| `contacts` | Engineer contacts | name, email, teams, phone, article_id |
| `ticket_articles` | Ticket↔Article links (119) | ticket_id, article_id |
| `users` | User accounts (empty — not yet implemented) | name, email, password_hash, role |
| `audit_log` | Change tracking (empty) | user_id, action, entity_type, entity_id, details |

### Indexes

- Full-text search GIN indexes on `tickets.search_vector` and `knowledge_articles.search_vector`
- Trigram indexes (pg_trgm) for fuzzy matching
- Standard B-tree indexes on reference, group, priority, severity, status, keywords, subgroup_id, legacy_group

## 7. Domain Model

```
Group (8 domains: G01-G08)
  ├── Subgroup (30 subgroups)
  │     └── Ticket (237 incidents, classified with subgroup_id)
  │           ├── Custom Fields (JSONB, group-specific)
  │           ├── Similar Incidents (trigram + group + root cause)
  │           └── Related Knowledge Articles
  └── Quick Lookup Keyword (87 keyword→group mappings)

Knowledge Article (9 articles)
  ├── References (21 external links)
  ├── Contacts
  └── Related Tickets (via ticket_articles)
```

## 8. Classification System

### 8 Official Groups with 30 Subgroups (from Excel v4)

| Code | Name | Legacy | Tickets | Subgroups |
|---|---|---|---|---|
| G01 | COB & Batch Processing | A, B, C | 68 | 5 (AA.CREATE.NAU.ACTIVITIES Failures, COB Module & EOD Failures, Start/End of Day, COB Performance, COB Processing Issues) |
| G02 | Account & Arrangement Lifecycle | E, ACCT-LIFECYCLE | 32 | 6 (Arrangement Lifecycle & Closure, Account Management, Account Access/Status/Data, Product Config, Migration, Activities & Repayment) |
| G03 | Interest, Loans & Accruals | D, F, INTEREST-LOANS | 37 | 4 (Interest Accrual & Capitalization, Interest Payout & Settlement, Loans & Lending, Interest & Profit Processing) |
| G04 | Payments, Transfers, FX & GL | G, PAYMENTS-FX | 38 | 4 (Payments & Transfers, FX & International Payments, GL/Accounting/Posting, Account Sweep & Funds Movement) |
| G05 | Teller, Cash, Cheque & Branch Operations | H, TELLER-BRANCH | 15 | 3 (Teller & Cash Operations, Cheque & Clearing, Branch Operations) |
| G06 | Compliance, FCM & AML | I, COMPLIANCE | 9 | 1 (FCM & Screening) |
| G07 | Limits, Overdrafts & Restrictions | D2, E2, E4 | 13 | 3 (Overdraft & Working Balance, Transaction & Activity Restrictions, Limits & Limit Validation) |
| G08 | System Administration, Configuration & Platform | J, SYS-ADMIN | 25 | 3 (System Admin & Config, System Access/Tools/Utilities, Platform/Deployment/Environment) |

**Total: 237 incidents, 29 subgroups**

### Legacy Group Mapping

Original Excel groups A-J are preserved in `tickets.legacy_group` and `groups.legacy_code`.

### Classification Confidence

Each incident has a `classification_confidence` field: High (120) or Medium (117).

### Group-Specific Dynamic Fields (instruction §12)

Each group displays relevant fields on the incident creation/edit form:
- **G01**: COB Process, Batch/Job, Affected Service, T24 Routine, Error Message
- **G02**: Account Type, Product Code, Operation, Error/Block
- **G03**: Interest Type, Product, Accounting Issue, T24 Record
- **G04**: Payment Type, Transaction Type, Currency, GL Account, Posting Issue
- **G05**: Teller/Vault, Transaction Type, Branch, Operation
- **G06**: Screening Type, FCM Module, AML Rule, Screening Result
- **G07**: Limit Type, Overdraft Type, Restriction Type
- **G08**: Platform Component, Configuration, Service, Issue Type

## 9. Completed Features

- [x] Excel import — all 4 sheets (Group_Summary, All_Tickets_Grouped, Quick_Lookup, Sub_Types)
- [x] PostgreSQL schema with full-text search + trigram indexes
- [x] Multi-strategy search engine (exact ticket ref, quick lookup, full-text, trigram)
- [x] Incident list page with pagination, filtering, and sorting
- [x] Incident detail page with historical metadata, subgroup, legacy group
- [x] Similar incidents feature (group + root cause + trigram similarity)
- [x] Related knowledge articles on incident detail
- [x] Related tickets on knowledge article detail
- [x] Knowledge article detail with Problem/Solution separation
- [x] Add knowledge article form
- [x] Groups browse page with descriptive names and incident counts
- [x] Group detail page with subgroup filtering, sorting, pagination, articles, keywords
- [x] Quick Lookup page (keyword → group mapping)
- [x] Reference links imported from Sub_Types sheet
- [x] Ticket↔Article linking (119 relationships)
- [x] Sidebar navigation
- [x] Responsive design (mobile + desktop)
- [x] Copy buttons for diagnostic commands
- [x] Classification v4 — 8 official groups with 30 subgroups from Excel v4
- [x] All 237 incidents reclassified with subgroup_id, confidence, legacy_group
- [x] Incident creation form (+ Add Incident) with dynamic group→subgroup selection and group-specific fields
- [x] Incident editing form (Edit Incident) with same dynamic fields
- [x] Custom fields support (JSONB on tickets table) — rendered on detail page
- [x] Sorting on incident lists (date, reference, priority, severity)
- [x] Subgroup filtering on group detail page
- [x] Dynamic group dropdowns — all filters use API-fetched groups

## 10. Current Development Phase

**Phase 2: Classification & Navigation** — COMPLETE

8-group taxonomy with 30 subgroups, all 237 incidents reclassified, edit/sort/filter working.

## 11. Recent Changes

### 2026-08-20 — Classification v4 & Full Feature Set

Implemented:
- Reclassified all 237 incidents into 8 official groups with 30 subgroups from Excel v4
- Added subgroup_id, classification_confidence, classification_note, legacy_group columns to tickets
- Group detail page redesigned: subgroup filtering, sorting, pagination, proper incident list
- Edit Incident feature (PUT /api/incidents/:id) with dynamic Group→Subgroup selection
- Sorting on incident lists (date, reference, priority, severity — ascending/descending)
- Custom fields rendered on incident detail page
- Dynamic group→subgroup selection on Add/Edit forms (§7)
- Group-specific dynamic fields per instruction §12
- Migration script: scripts/migrate-v4.ts

### 2026-08-20 — Group Reorganization & Incident Creation

Implemented:
- Reorganized 10 legacy groups (A-J) into 7 descriptive technical domains
- Added legacy_code column to preserve original A-J classifications
- Created migration script (scripts/migrate-groups.ts) with verification
- All 237 tickets, 87 keywords, 9 articles, 9 subtypes migrated
- Added custom_fields JSONB column to tickets for dynamic group-specific data
- Created incident creation form (/incidents/new) with dynamic group-specific fields
- Updated all UI pages to fetch groups from API (no more hardcoded A-J)
- Homepage: Browse Knowledge Domains grid + Add Incident button
- Groups page: descriptive names instead of single letters
- Search/Incidents/Knowledge pages: dynamic group dropdowns

### 2026-08-20 — SRS v2.0 Alignment

Implemented:
- System renamed to "T24 Incident Knowledge Archive"
- Homepage redesigned: search-focused, minimal, with example queries
- Tickets → Incidents renamed throughout
- Navigation: Home, Search, Incidents, Groups, Knowledge, Quick Lookup
- Search engine rewritten: exact ticket match highest rank, quick lookup integration
- Similar Incidents on incident detail
- Related Knowledge on incident detail
- Related Tickets on knowledge detail
- Knowledge article page: Problem/Solution structure
- Knowledge creation page at /knowledge/new

### 2026-08-20 — Excel Import

Implemented:
- Import script rewritten for title row + header row structure
- All 4 sheets parsed: 10 groups, 237 tickets, 87 keywords, 9 subtypes
- 9 knowledge articles created from Sub_Types with rich content
- 21 reference links imported
- 119 ticket-article relationships linked

## 12. Known Issues

1. **No authentication** — users table is empty, no login system
2. **No admin interface** — groups, subtypes cannot be managed via UI (§5, §6 need + New Group / + New Subgroup buttons)
3. **No file upload** — §4 requires attachment support
4. **No full custom field system** — per instruction §13, should support admin-created fields without code changes
5. **No audit trail** — audit_log table exists but not populated
6. **Knowledge articles only for G02 and G03** — Other domains (G01, G04-G08) need content
7. **No archiving/restore** — instruction §17 requires soft-delete capability
8. **Excel re-import** — keywords table was cleared during migration, needs re-import from Excel v4
9. **No Excel export** — only import exists

## 13. Important Design Decisions

- **Incidents are never hard deleted** — only archived (not yet implemented)
- **Knowledge articles are linked to subtypes, not individual tickets** — one article covers a problem type
- **Quick lookup keywords are automatically used in search** — no manual lookup needed
- **Search ranking prioritizes exact ticket reference > error > keyword > full-text > trigram**
- **Historical metadata (requester, dates, status) is preserved but presented as reference info, not workflow**
- **No AI or external services in v1** — PostgreSQL search is sufficient for 237 incidents
- **The Sub_Types sheet is the richest data source** — contains root cause, diagnosis, fix, verification, contacts, references

## 14. Migration Status

| Source | Target | Records | Status |
|---|---|---|---|
| Incident_Classification (v4) | tickets reclassified | 237/237 | ✓ All classified |
| Classification_Taxonomy (v4) | subgroups | 30 (29 with data) | ✓ Created |
| New_Group_Summary (v4) | groups | 8 | ✓ Created |
| All_Tickets_Grouped | tickets | 237 | ✓ Imported |
| Quick_Lookup | keywords | 87 | ⚠️ Cleared during migration — needs re-import |
| Sub_Types | knowledge_articles | 9 | ✓ Created (group_id cleared, needs re-linking) |
| Sub_Types | references_table | 21 | ✓ Imported |
| Auto-generated | ticket_articles | 119 | ✓ Linked |

## 15. Next Tasks (Priority Order)

1. **Re-import keywords** — keywords table was cleared during migration
2. **File upload support** — §4: attach screenshots, logs, PDFs to incidents
3. **Admin interface** — manage groups (§5), subgroups (§6), users, import/export
4. **Full custom field system** — admin-create fields per group without code changes (§13)
5. **Authentication** — login system with Viewer/Editor/Admin roles (§20)
6. **Archiving** — soft-delete with restore capability (§17)
7. **Knowledge articles for remaining domains** — G01, G04-G08 need content
8. **Audit trail** — track changes (§21)
9. **Excel export** — export incidents and knowledge articles

## 16. Development Rules

1. **Read AGENT.md before every new session**
2. **Search is the most important feature** — optimize for findability
3. **Never silently delete historical data** — archive, don't delete
4. **Keep it simple** — no unnecessary external services
5. **Test before claiming completion** — run build, typecheck, manual tests
6. **Update AGENT.md after every meaningful change**
7. **Reuse working code** — don't rewrite for aesthetic reasons
8. **Focus changes** — don't refactor unrelated features
9. **Data-driven configuration** — groups, subtypes, fields from database, not code
