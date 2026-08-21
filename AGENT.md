# Tsehay Bank Incident Knowledge Base

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

## 3. UI/UX Theme

| Token | Value |
|---|---|
| Primary | #215B30 (green) |
| Secondary | #FEC80C (yellow) |
| Product Name | Tsehay Bank Incident Knowledge Base |

CSS variables defined in `globals.css`: `--primary`, `--secondary`.
All focus rings, active nav states, and primary buttons use the primary green.

## 4. Product Principles

- **Search first** — the homepage is a search box
- **Fast navigation** — minimal clicks to reach a solution
- **Historical knowledge, not ticket tracking** — no "My Open Tickets", no SLA, no workflow
- **Preserve historical information** — never silently delete incidents
- **Avoid unnecessary complexity** — no Elasticsearch, Redis, AI, microservices
- **Simple maintainable solutions** — Next.js + PostgreSQL + Tailwind
- **Data-driven** — groups, subtypes, keywords are database records, not hardcoded
- **Knowledge over incident management** — "Learn from the ticket, don't manage the ticket"

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.3.1, React 19, TypeScript 5, Tailwind CSS 4 |
| Backend | Next.js API Routes (App Router) |
| Database | PostgreSQL 16 (with pg_trgm, uuid-ossp extensions) |
| ORM | None — raw SQL via `pg` driver |
| Search | PostgreSQL Full-Text Search + pg_trgm trigram similarity + ILIKE fallback |
| Excel Import | xlsx library |
| Dev/Build | tsx (TypeScript execution), Turbopack |
| Deployment | Local Linux (Docker-ready) |

## 6. Architecture

```
src/
├── app/
│   ├── page.tsx                  # Home (search-focused)
│   ├── layout.tsx                # Root layout + sidebar nav
│   ├── globals.css               # Tailwind imports
│   ├── search/page.tsx           # Search results page
│   ├── incidents/page.tsx        # Incident list (paginated)
│   ├── incidents/[id]/page.tsx   # Incident detail (with KB context)
│   ├── incidents/[id]/edit/page.tsx  # Edit incident (with file upload)
│   ├── incidents/new/page.tsx    # Create incident (with file upload)
│   ├── admin/page.tsx            # Admin: manage groups/subgroups
│   ├── groups/page.tsx           # Browse groups
│   ├── groups/[code]/page.tsx    # Group detail (subtypes, tickets, articles, comments)
│   ├── knowledge/page.tsx        # Knowledge articles list
│   ├── knowledge/[id]/page.tsx   # Knowledge article detail
│   ├── knowledge/new/page.tsx    # Add knowledge article form
│   ├── quick-lookup/page.tsx     # Keyword → Group mapping browser
│   └── api/
│       ├── search/route.ts       # GET /api/search?q=...
│       ├── incidents/route.ts    # GET /api/incidents (paginated, filtered), POST
│       ├── incidents/[id]/route.ts # GET /api/incidents/:id, PUT
│       ├── knowledge/route.ts    # GET /api/knowledge (with subtype_id filter), POST
│       ├── knowledge/[id]/route.ts # GET /api/knowledge/:id
│       ├── groups/route.ts       # GET /api/groups (with counts)
│       ├── groups/[id]/route.ts  # GET /api/groups/:id (with subtypes, tickets, articles, keywords)
│       ├── admin/groups/route.ts # GET/POST /api/admin/groups
│       ├── admin/groups/[id]/route.ts # GET/PUT/DELETE /api/admin/groups/:id
│       ├── admin/subgroups/route.ts # GET/POST /api/admin/subgroups
│       ├── admin/subgroups/[id]/route.ts # GET/PUT/DELETE /api/admin/subgroups/:id
│       ├── files/route.ts        # GET/POST /api/files (file upload)
│       ├── files/[id]/route.ts   # GET/DELETE /api/files/:id
│       ├── files/[id]/download/route.ts # GET /api/files/:id/download
│       ├── comments/route.ts     # GET/POST/DELETE /api/comments
│       ├── keywords/route.ts     # GET /api/keywords
│       └── stats/route.ts        # GET /api/stats (dashboard data)
├── components/
│   ├── Navigation.tsx            # Sidebar navigation
│   └── ui/
│       ├── Badge.tsx             # Colored badge component
│       ├── CopyButton.tsx        # Clipboard copy button
│       ├── FileUpload.tsx        # File upload component (drag & drop, validation)
│       ├── SearchBox.tsx         # Search with inline results (debounced, search-as-you-type)
│       ├── CommentsSection.tsx   # Comments/discussion for knowledge base pages
│       └── StatCard.tsx          # Statistics card
├── lib/
│   ├── db.ts                     # PostgreSQL connection pool + query helpers
│   ├── search.ts                 # Multi-strategy search engine (typo-tolerant)
│   └── types.ts                  # TypeScript interfaces
scripts/
├── schema.sql                    # Full PostgreSQL schema
├── migrate-comments.sql          # Comments table migration
├── migrate-search-indexes.sql    # Trigram index migration for search
├── import-xlsx.ts                # Excel import script (all 4 sheets)
└── examine-excel.ts              # (deleted — was temporary)
```

## 7. Database Schema

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
| `incident_files` | File attachments for incidents | ticket_id, original_name, stored_name, file_size, mime_type |
| `kb_comments` | Knowledge base comments | entity_type (group/subtype), entity_id, author, body |
| `users` | User accounts (empty — not yet implemented) | name, email, password_hash, role |
| `audit_log` | Change tracking (empty) | user_id, action, entity_type, entity_id, details |

### Indexes

- Full-text search GIN indexes on `tickets.search_vector` and `knowledge_articles.search_vector`
- Trigram indexes (pg_trgm) for fuzzy matching on: tickets.summary, tickets.reference, tickets.root_cause_category, knowledge_articles.title, knowledge_articles.symptoms, knowledge_articles.root_cause, subtypes.name, groups.name
- Standard B-tree indexes on reference, group, priority, severity, status, keywords, subgroup_id, legacy_group
- Index on kb_comments(entity_type, entity_id) for fast comment retrieval

## 8. Domain Model

```
Group (8 domains: G01-G08)
  ├── Subgroup (30 subgroups)
  │     └── Ticket (237 incidents, classified with subgroup_id)
  │           ├── Custom Fields (JSONB, group-specific)
  │           ├── File Attachments (incident_files)
  │           ├── Similar Incidents (trigram + group + root cause)
  │           └── Related Knowledge Articles
  └── Quick Lookup Keyword (87 keyword→group mappings)

Knowledge Article (9 articles)
  ├── References (21 external links)
  ├── Contacts
  ├── Related Tickets (via ticket_articles)
  └── Comments (via kb_comments)

Comments (kb_comments)
  ├── Linked to Group or Subgroup
  ├── Author, body, timestamps
  └── Separate from official knowledge content
```

## 9. Classification System

### 8 Official Groups with 30 Subgroups (from Excel v4)

| Code | Name | Legacy | Tickets | Subgroups |
|---|---|---|---|---|
| G01 | COB & Batch Processing | A, B, C | 68 | 5 |
| G02 | Account & Arrangement Lifecycle | E, ACCT-LIFECYCLE | 32 | 6 |
| G03 | Interest, Loans & Accruals | D, F, INTEREST-LOANS | 37 | 4 |
| G04 | Payments, Transfers, FX & GL | G, PAYMENTS-FX | 38 | 4 |
| G05 | Teller, Cash, Cheque & Branch Operations | H, TELLER-BRANCH | 15 | 3 |
| G06 | Compliance, FCM & AML | I, COMPLIANCE | 9 | 1 |
| G07 | Limits, Overdrafts & Restrictions | D2, E2, E4 | 13 | 3 |
| G08 | System Administration, Configuration & Platform | J, SYS-ADMIN | 25 | 3 |

**Total: 237 incidents, 29 subgroups**

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

## 10. Completed Features

- [x] Admin Group & Subgroup Management — CRUD via /admin page, modals for create/edit
- [x] Incident file uploads — upload, view, download, delete via FileUpload component
- [x] File upload on incident edit — FileUpload component integrated in edit form
- [x] File upload on incident creation — files stored and associated after incident is created
- [x] Font readability — sharper text rendering, better contrast, stronger font weights
- [x] Incident lookup fix — robust reference matching (trim, partial, numeric), fallback context display
- [x] Empty-description incidents — show group/subgroup context knowledge
- [x] Incident ↔ Knowledge Base relationship — incident detail shows directly linked KB fixes with full content (root cause, fix, diagnostic), shows 'no related KB' message when empty
- [x] Group Knowledge Base context — shows broader group articles as secondary context
- [x] Incident list search bar — search by reference or description
- [x] Incident list date formatting — clean date display without microseconds
- [x] Clickable Group/Subgroup links — navigate to knowledge base from incident detail
- [x] Inline Group creation from incident form — "+ New" button on Group dropdown
- [x] Inline Subgroup creation from incident form — "+ New" button on Subgroup dropdown
- [x] Knowledge base comments — CommentsSection component on knowledge article detail pages (not group pages)
- [x] Comments API — POST/GET/DELETE for kb_comments (supports group, subtype, knowledge entity types)
- [x] Comment file attachments — attach files (PNG, PDF, DOC, etc.) to comments with download support
- [x] Typo-tolerant search — trigram similarity + ILIKE fallback for misspellings
- [x] Search-as-you-type — debounced inline results (300ms) in SearchBox component
- [x] Search results cancel stale requests — AbortController prevents old results overwriting new
- [x] Search indexes — trigram indexes on summary, reference, root_cause, title, symptoms, group/subgroup names
- [x] Excel import — all 4 sheets
- [x] PostgreSQL schema with full-text search + trigram indexes
- [x] Multi-strategy search engine (exact ticket ref, quick lookup, full-text, trigram, ILIKE)
- [x] Incident list page with pagination, filtering, and sorting
- [x] Incident detail page with historical metadata, subgroup, legacy group
- [x] Similar incidents feature
- [x] Related knowledge articles on incident detail
- [x] Related tickets on knowledge article detail
- [x] Knowledge article detail with Problem/Solution separation
- [x] Add knowledge article form
- [x] Groups browse page with descriptive names and incident counts
- [x] Group detail page with subgroup filtering, sorting, pagination, articles, keywords, comments
- [x] Quick Lookup page (keyword → group mapping)
- [x] Ticket↔Article linking (119 relationships)
- [x] Sidebar navigation with responsive mobile menu
- [x] Classification v4 — 8 official groups with 30 subgroups
- [x] Custom fields support (JSONB on tickets table)
- [x] Tsehay Bank branding (sidebar, title, metadata)
- [x] Consistent focus states, buttons, form controls

## 11. Search Engine Details

### Search Strategy Ranking

1. **Exact ticket reference** (score: 1.0) — TSR-3183311 or 3183311
2. **Partial ticket reference** (score: 0.95) — trigram similarity on reference
3. **Quick lookup keyword** (score: 0.85) — keyword → group mapping
4. **Full-text on tickets** (score: 0.35-0.7) — PostgreSQL ts_rank_cd
5. **Trigram on tickets** (score: 0.12-0.6) — typo-tolerant similarity on summary, reference, root_cause
6. **ILIKE fallback** (score: 0.25) — partial word matching for common typos
7. **Full-text on knowledge articles** (score: 0.25-0.5) — title, symptoms, root_cause
8. **Trigram on knowledge articles** (score: 0.15-0.45) — fuzzy matching on title, symptoms, root_cause
9. **Group/Subgroup name matching** (score: 0.3-0.4) — find articles by group/subgroup name similarity

### Typo Tolerance

The search engine handles common misspellings by:
- Using pg_trgm trigram similarity for fuzzy matching
- ILIKE partial matching as fallback
- Case-insensitive matching throughout
- Word/token matching with normalized queries
- No replacement of user's original search text

### Search-as-you-type

- Debounce: 300ms (prevents excessive API calls)
- AbortController: cancels stale requests
- Inline results dropdown: shows top 8 matches
- "View all results" link to full search page
- Empty query restores default state

## 12. Recent Changes

### 2026-08-21 — Incident List Search, KB Always Show, Comment File Attachments

Implemented:
- **Incident list search bar**: Search by reference or description, filters results in real-time
- **Incident list date formatting**: Clean date display (e.g. "Jun 11, 2026") without microseconds
- **KB section always visible**: Incident detail always shows Knowledge Base Fixes section, with 'no related KB' message when no articles are linked
- **Comment file attachments**: Users can attach files (PNG, PDF, DOC, etc.) to comments on knowledge article pages
- **Comment file download**: Download attached files from comments

Files modified:
- src/app/incidents/page.tsx — Added search bar, date formatting function
- src/app/api/incidents/route.ts — Added search parameter support
- src/app/incidents/[id]/page.tsx — KB section always visible with empty state message
- src/components/ui/CommentsSection.tsx — Added file attachment UI with drag-and-drop
- src/app/api/comments/route.ts — Added multipart form data support for file uploads
- src/app/api/comments/download/route.ts — New file download endpoint
- scripts/schema.sql — Added file columns to kb_comments

Database changes:
- kb_comments table: added file_name, file_stored, file_size, file_type columns

### 2026-08-21 — Incident↔Knowledge Base Fixes, Comments Moved

Implemented:
- **Directly linked KB fixes on incident detail**: Shows articles linked via ticket_articles with full content (root cause, immediate fix, permanent fix, verification, diagnostic)
- **Group articles as secondary context**: Broader group-level articles shown separately from directly linked fixes
- **Comments moved to knowledge article pages**: CommentsSection now renders on /knowledge/[id] instead of /groups/[code]
- **Comments support knowledge entity type**: kb_comments CHECK constraint updated to allow 'knowledge'

Files modified:
- src/app/incidents/[id]/page.tsx — Removed separate client-side KB fetches, shows linked articles with full content
- src/app/api/incidents/[id]/route.ts — Fetches directly linked articles via ticket_articles + group articles as fallback
- src/app/knowledge/[id]/page.tsx — Added CommentsSection under article content
- src/app/groups/[code]/page.tsx — Removed CommentsSection
- src/components/ui/CommentsSection.tsx — Added 'knowledge' entity type support
- src/app/api/comments/route.ts — Added 'knowledge' to allowed entity types
- scripts/schema.sql — Updated CHECK constraint
- scripts/migrate-comments.sql — Updated CHECK constraint

Database changes:
- kb_comments entity_type CHECK constraint updated to allow 'knowledge'

### 2026-08-21 — Knowledge Base & Search Improvements

Implemented:
- **Incident ↔ Knowledge Base relationship**: Incident detail page shows Group/Subgroup KB context when description is sparse
- **Clickable Group/Subgroup links**: Navigate to knowledge base from incident detail page
- **File upload on incident edit**: FileUpload component integrated into edit form with existing files display
- **File upload on incident creation**: Pending files uploaded after incident is created, with preview and remove
- **Inline Group/Subgroup creation**: "+ New" button on Group/Subgroup dropdowns in both create and edit forms
- **Knowledge base comments**: CommentsSection component with POST/GET/DELETE API, author/date/body storage
- **Typo-tolerant search**: Trigram indexes added on summary, reference, root_cause, title, symptoms, group/subgroup names; ILIKE fallback for fuzzy matching
- **Search-as-you-type**: SearchBox component with 300ms debounce, inline results dropdown, AbortController for stale requests
- **Knowledge API subtype_id filter**: /api/knowledge now supports ?subtype_id= filtering

Database changes:
- New table: kb_comments (entity_type, entity_id, author, body, timestamps)
- New indexes: 8 trigram indexes for improved search (migrate-search-indexes.sql)
- New migration: migrate-comments.sql

Files modified:
- src/app/incidents/[id]/page.tsx — Enhanced with Group/Subgroup KB context
- src/app/incidents/[id]/edit/page.tsx — Added file upload and inline group/subgroup creation
- src/app/incidents/new/page.tsx — Added file upload and inline group/subgroup creation
- src/app/groups/[code]/page.tsx — Added comments section
- src/app/api/knowledge/route.ts — Added subtype_id filter
- src/components/ui/SearchBox.tsx — Search-as-you-type with debounce and inline results
- src/lib/search.ts — Improved typo tolerance and ranking
- src/components/ui/CommentsSection.tsx — New comments component
- src/app/api/comments/route.ts — New comments API

### 2026-08-20 — Admin, File Upload, Incident Fix, Typography

Implemented:
- Admin page (/admin): manage groups and subgroups with CRUD modals
- Admin API routes: POST/PUT/DELETE for groups and subgroups
- File upload system: incident_files table, upload API, download API, FileUpload component
- Incident lookup fix: robust reference matching (trim, partial, numeric), fallback context
- Empty-description incidents: show group/subgroup context knowledge
- Font readability: sharper text rendering, -webkit-font-smoothing, stronger headings
- Navigation: added Admin link with settings icon
- New database table: incident_files (ticket_id, original_name, stored_name, file_size, mime_type)

### 2026-08-20 — UI/UX Overhaul

Implemented:
- Tsehay Bank branding throughout (sidebar, title, metadata)
- Brand colors: primary #215B30, secondary #FEC80C
- CSS theme variables in globals.css
- Navigation: SVG icons, primary green active states, cleaner layout
- Incident listing: removed Priority/Severity columns, 15 rows/page, compact density
- Group listing: cleaner cards with description, incident counts
- Group detail: subgroup hierarchy with cards, compact incident table, 15 rows
- Search: cleaner filters, consistent result cards
- Incident detail: better typography, organized sections
- Incident creation: sectioned form (Incident Info, Classification, Technical Details)
- Incident edit: same sectioned layout
- Empty states: helpful messages with guidance
- Loading states: skeleton animations
- Focus states: consistent primary green focus rings

### 2026-08-20 — Classification v4 & Full Feature Set

Implemented:
- Reclassified all 237 incidents into 8 official groups with 30 subgroups from Excel v4
- Added subgroup_id, classification_confidence, classification_note, legacy_group columns to tickets
- Group detail page redesigned: subgroup filtering, sorting, pagination, proper incident list
- Edit Incident feature (PUT /api/incidents/:id) with dynamic Group→Subgroup selection
- Sorting on incident lists (date, reference, priority, severity — ascending/descending)
- Custom fields rendered on incident detail page
- Dynamic group→subgroup selection on Add/Edit forms
- Group-specific dynamic fields per instruction §12

### 2026-08-20 — Group Reorganization & Incident Creation

Implemented:
- Reorganized 10 legacy groups (A-J) into 7 descriptive technical domains
- Added legacy_code column to preserve original A-J classifications
- Added custom_fields JSONB column to tickets for dynamic group-specific data
- Created incident creation form (/incidents/new) with dynamic group-specific fields
- Updated all UI pages to fetch groups from API

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

## 13. Known Issues

1. **No authentication** — users table is empty, no login system (editor/admin roles assumed)
2. **No audit trail** — audit_log table exists but not populated
3. **Knowledge articles only for G02 and G03** — Other domains (G01, G04-G08) need content
4. **No archiving/restore** — instruction §17 requires soft-delete capability
5. **No Excel export** — only import exists
6. **Build _global-error warning** — pre-existing Next.js prerender issue, not affecting functionality

## 14. Important Design Decisions

- **Incidents are never hard deleted** — only archived (not yet implemented)
- **Knowledge articles are linked to subtypes, not individual tickets** — one article covers a problem type
- **Quick lookup keywords are automatically used in search** — no manual lookup needed
- **Search ranking prioritizes exact ticket reference > error > keyword > full-text > trigram > ILIKE**
- **Historical metadata (requester, dates, status) is preserved but presented as reference info, not workflow**
- **No AI or external services in v1** — PostgreSQL search is sufficient for 237 incidents
- **The Sub_Types sheet is the richest data source** — contains root cause, diagnosis, fix, verification, contacts, references
- **Comments are separate from official knowledge content** — engineers add insights without modifying the article
- **Search-as-you-type uses 300ms debounce** — balances responsiveness with server load
- **Stale search requests are cancelled** — AbortController prevents older results from overwriting newer ones
- **File uploads on new incidents are stored temporarily** — uploaded after incident creation succeeds

## 15. Migration Status

| Source | Target | Records | Status |
|---|---|---|---|
| Incident_Classification (v4) | tickets reclassified | 237/237 | ✓ All classified |
| Classification_Taxonomy (v4) | subgroups | 30 (29 with data) | ✓ Created |
| New_Group_Summary (v4) | groups | 8 | ✓ Created |
| All_Tickets_Grouped | tickets | 237 | ✓ Imported |
| Quick_Lookup | keywords | 87 | ✓ Imported |
| Sub_Types | knowledge_articles | 9 | ✓ Created |
| Sub_Types | references_table | 21 | ✓ Imported |
| Auto-generated | ticket_articles | 119 | ✓ Linked |
| Manual | incident_files | varies | ✓ File attachment system |
| Manual | kb_comments | 0+ | ✓ Comments system |

## 16. Next Tasks (Priority Order)

1. **Authentication** — login system with Viewer/Editor/Admin roles (§20)
2. **Full custom field system** — admin-create fields per group without code changes (§13)
3. **Archiving** — soft-delete with restore capability (§17)
4. **Knowledge articles for remaining domains** — G01, G04-G08 need content
5. **Audit trail** — track changes (§21)
6. **Excel export** — export incidents and knowledge articles

## 17. Development Rules

1. **Read AGENT.md before every new session**
2. **Search is the most important feature** — optimize for findability
3. **Never silently delete historical data** — archive, don't delete
4. **Keep it simple** — no unnecessary external services
5. **Test before claiming completion** — run build, typecheck, manual tests
6. **Update AGENT.md after every meaningful change**
7. **Reuse working code** — don't rewrite for aesthetic reasons
8. **Focus changes** — don't refactor unrelated features
9. **Data-driven configuration** — groups, subtypes, fields from database, not code
