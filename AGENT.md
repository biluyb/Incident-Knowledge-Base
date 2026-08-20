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

The system stores 237 previously solved incidents imported from an Excel workbook, with 9 detailed knowledge articles covering Group D (Interest Catch-All) and Group E (Overdraft) sub-types.

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
| `groups` | Incident categories (A-J) | code, name, description |
| `subtypes` | Detailed problem types within groups | code, name, description, group_id |
| `tickets` | Historical incidents (237 records) | reference, summary, status, requester, root_cause_category, priority, severity, group_id, search_vector |
| `knowledge_articles` | Reusable solutions (9 from subtypes) | title, symptoms, root_cause, diagnostic_data, immediate_fix, permanent_fix, prevention, verification, temenos_contact, group_id, subtype_id, search_vector, status |
| `keywords` | Quick lookup terms (87) | keyword, group_id, weight |
| `references_table` | External links (21) | title, url, reference_type, article_id |
| `contacts` | Engineer contacts | name, email, teams, phone, article_id |
| `ticket_articles` | Ticket↔Article links (119) | ticket_id, article_id |
| `users` | User accounts (empty — not yet implemented) | name, email, password_hash, role |
| `audit_log` | Change tracking (empty) | user_id, action, entity_type, entity_id, details |
| `search_analytics` | Search log (7 records) | query, results_count |

### Indexes

- Full-text search GIN indexes on `tickets.search_vector` and `knowledge_articles.search_vector`
- Trigram indexes (pg_trgm) for fuzzy matching
- Standard B-tree indexes on reference, group, priority, severity, status, keywords

## 7. Domain Model

```
Group (A-J, 10 groups)
  ├── Subtype (9 subtypes: D1-D4, E1-E5)
  │     └── Knowledge Article (9 articles with rich diagnostic content)
  │           ├── References (21 external links)
  │           ├── Contacts
  │           └── Historical Tickets (linked via ticket_articles)
  ├── Ticket (237 incidents)
  │     └── Keywords (via search)
  └── Quick Lookup Keyword (87 keyword→group mappings)
```

## 8. Classification System

### Current: Legacy Excel Groups (A-J)

| Code | Name | Tickets |
|---|---|---|
| A | COB Crashes & Hangs in AA.CREATE.NAU.ACTIVITIES | 10 |
| B | COB Crashes in AA.SERVICE.PROCESS & Specialized EOD Modules | 15 |
| C | COB Performance Degradation & Start-of-Day Issues | 8 |
| D | Interest Catch-All Entries & New Product Account Issues | 15 |
| E | Overdraft (OD) Account Lifecycle & Operations | 15 |
| F | Interest Accrual, Capitalization & Loan Interest Lifecycle | 12 |
| G | FX Revaluation, GL Differences & Payment Entry Issues | 12 |
| H | Teller, Vault, Cheque & Transaction Management | 12 |
| I | FCM Compliance Screening & AML Watch Lists | 12 |
| J | System Administration, Platform Defects & Miscellaneous | 12 |

**IMPORTANT**: Per SRS §8, these legacy A-J groups should be reorganized into ~7-8 meaningful technical domains for the user-facing UI. The current code still uses A-J codes throughout.

### Suggested Future Groups (per SRS §8)

1. COB & Batch Processing
2. Account, Arrangement & Lifecycle Management
3. Interest, Loans & Accrual Processing
4. Payments, Transfers, FX & GL
5. Teller, Cash, Cheque & Branch Operations
6. Compliance, FCM & AML
7. Limits, Overdrafts & Transaction Restrictions
8. System Administration, Configuration & Platform Issues

## 9. Completed Features

- [x] Excel import — all 4 sheets (Group_Summary, All_Tickets_Grouped, Quick_Lookup, Sub_Types)
- [x] PostgreSQL schema with full-text search + trigram indexes
- [x] Multi-strategy search engine (exact ticket ref, quick lookup, full-text, trigram)
- [x] Incident list page with pagination and filtering
- [x] Incident detail page with historical metadata
- [x] Similar incidents feature (group + root cause + trigram similarity)
- [x] Related knowledge articles on incident detail
- [x] Related tickets on knowledge article detail
- [x] Knowledge article detail with Problem/Solution separation
- [x] Add knowledge article form
- [x] Groups browse page
- [x] Group detail page with subtypes, tickets, articles, keywords
- [x] Quick Lookup page (keyword → group mapping)
- [x] Reference links imported from Sub_Types sheet
- [x] Ticket↔Article linking (119 relationships)
- [x] Sidebar navigation
- [x] Responsive design (mobile + desktop)
- [x] Copy buttons for diagnostic commands

## 10. Current Development Phase

**Phase 1: Foundation** — COMPLETE

Excel data imported, core search and browse working, knowledge articles with rich content.

## 11. Recent Changes

### 2026-08-20 — SRS v2.0 Alignment

Implemented:
- System renamed to "T24 Incident Knowledge Archive"
- Homepage redesigned: search-focused, minimal, with example queries
- Tickets → Incidents renamed throughout
- Navigation: Home, Search, Incidents, Groups, Knowledge, Quick Lookup
- Search engine rewritten: exact ticket match highest rank, quick lookup integration
- Similar Incidents on incident detail (SRS §23)
- Related Knowledge on incident detail (SRS §24)
- Related Tickets on knowledge detail (SRS §25)
- Knowledge article page: Problem/Solution structure (SRS §16)
- Knowledge creation page at /knowledge/new (SRS §26-27)

### 2026-08-20 — Excel Import

Implemented:
- Import script rewritten for title row + header row structure
- All 4 sheets parsed: 10 groups, 237 tickets, 87 keywords, 9 subtypes
- 9 knowledge articles created from Sub_Types with rich content
- 21 reference links imported
- 119 ticket-article relationships linked

## 12. Known Issues

1. **Legacy group codes (A-J) still used in UI** — Should be reorganized into descriptive technical domains per SRS §8
2. **No authentication** — users table is empty, no login system
3. **No admin interface** — groups, subtypes, users cannot be managed via UI
4. **No Excel export** — only import exists
5. **No incident creation from UI** — only knowledge articles can be added
6. **No custom field system** — per SRS §13, should support dynamic fields
7. **No audit trail** — audit_log table exists but not populated
8. **Knowledge articles only from Sub_Types** — Groups A, B, C, F, G, H, I, J have placeholder subtypes
9. **Groups page links use `/groups/[code]`** — code is single letter (A-J), not the SRS-suggested descriptive names
10. **Build warning** — Next.js 16 Turbopack, some client components need Suspense boundaries

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
| Group_Summary | groups | 11 → 10 | ✓ Imported |
| All_Tickets_Grouped | tickets | 237 | ✓ Imported |
| Quick_Lookup | keywords | 87 | ✓ Imported |
| Sub_Types | subtypes | 9 (from 17 rows, 8 placeholders skipped) | ✓ Imported |
| Sub_Types | knowledge_articles | 9 | ✓ Created |
| Sub_Types | references_table | 21 | ✓ Imported |
| Auto-generated | ticket_articles | 119 | ✓ Linked |

## 15. Next Tasks (Priority Order)

1. **Reorganize groups** into descriptive technical domains (SRS §8) — preserve A-J as legacy_group_code
2. **Authentication** — login system with Viewer/Editor/Admin roles
3. **Admin interface** — manage groups, subtypes, users
4. **Incident creation form** — document newly solved incidents
5. **Custom field system** — dynamic fields per group (SRS §13)
6. **Excel export** — export incidents and knowledge articles
7. **Archiving** — soft-delete with restore capability
8. **Audit trail** — track changes
9. **Knowledge articles for remaining groups** — Groups A, B, C, F, G, H, I, J need content

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
