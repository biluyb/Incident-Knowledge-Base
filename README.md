# Tsehay Bank Incident Knowledge Base

> Historical technical incident archive and knowledge base for T24/Temenos core banking operations.

---

## Overview

The **Tsehay Bank Incident Knowledge Base** is a specialized, production-ready technical knowledge archive. It allows core banking engineers, system administrators, and application support teams to search, diagnose, and resolve T24/Temenos incidents using historical resolution data, root cause analyses, diagnostic logs, and structured knowledge articles.

Key design principle: **"Learn from the ticket, don't manage the ticket."**

---

## Technical Architecture

- **Framework:** Next.js 16.3.1 (App Router with Turbopack)
- **Language:** TypeScript 5 (Strict Mode)
- **Styling:** Tailwind CSS 4 (Custom Theme Variables)
- **Database:** PostgreSQL 16 (Raw SQL via `pg` Connection Pool)
- **Search Engine:** PostgreSQL Full-Text Search (`tsvector`/`tsquery`) + Trigram Similarity (`pg_trgm`) + ILIKE Fallback
- **Authentication:** JWT Sessions (`jose` standard) with `httpOnly` secure cookies
- **Authorization:** Centralized RBAC Middleware (`proxy.ts` / `api-auth.ts`)
- **Audit Logging:** Database-backed Audit Log (`audit_log`) for all write/delete operations

---

## User Roles & RBAC Matrix

| Role | Incident Management | Knowledge Base | Admin & Users | File & Comments |
|---|---|---|---|---|
| **Admin** | Full (Create, Edit, Delete) | Full (Create, Edit, Delete) | User CRUD, Role Management | Upload, Delete Any, Audit View |
| **Knowledge Manager** | Full (Create, Edit, Delete) | Full (Create, Edit, Delete) | Group/Subgroup Management | Upload, Delete Any, Audit View |
| **Contributor** | Create, Edit | Create, Edit | View Only | Upload, Delete Own Comments |
| **Viewer** | View Only | View Only | No Access | Download Files, Add/View Comments |

---

## Quick Start (Local Setup)

### 1. Prerequisites
- Node.js 18+ or 20+
- PostgreSQL 16+

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure `.env.local`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/tcsp_incident_kb"
NEXTAUTH_SECRET="your-secure-random-jwt-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Database Initialization
Create database and run migrations:

```bash
psql -U postgres -c "CREATE DATABASE tcsp_incident_kb;"
psql -U postgres -d tcsp_incident_kb -f scripts/schema.sql
psql -U postgres -d tcsp_incident_kb -f scripts/migrate-comments.sql
psql -U postgres -d tcsp_incident_kb -f scripts/migrate-search-indexes.sql
```

### 4. Data Import (Optional)
Import historical incidents from Excel workbook:

```bash
npx tsx scripts/import-xlsx.ts /path/to/Incident_Knowledge_Base_v4.xlsx
```

### 5. Install Dependencies & Start Dev Server

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Production Build & Verification

To verify typescript compilation and build production assets:

```bash
# Type check
npx tsc --noEmit

# Production build
npm run build

# Start production server
npm run start
```

---

## Project Navigation Structure

- `/` — Dashboard (Metrics, Group Distribution, Root Causes, Search)
- `/search` — Multi-Strategy Typo-Tolerant Search
- `/incidents` — Historical Incident List (Filterable, Paginated)
- `/incidents/[id]` — Incident Detail & Linked Knowledge Fixes
- `/incidents/new` — Document New Incident
- `/knowledge` — Structured Knowledge Base Articles
- `/knowledge/[id]` — Knowledge Article Detail & Comments
- `/groups` — 8 Incident Domain Groups Overview
- `/groups/[code]` — Group Detail, Subgroups & Associated Incidents
- `/profile` — Self-Service Profile & Password Change
- `/admin` — System Administration (Users, Groups, Subgroups, Audit Logs)

---

## Security Best Practices

- All passwords hashed using `bcrypt` (12 rounds)
- Authorization checked both at Middleware level (`src/proxy.ts`) and API route level (`src/lib/api-auth.ts`)
- File uploads validated for extension whitelist and capped at 10MB
- All SQL queries use parameterized arguments ($1, $2) to eliminate SQL Injection risks
- Path traversal protections enforced on file downloads (`path.basename`)

---

## Documentation Index

Detailed documentation is available in the `docs/` directory:
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Security Audit & Controls](docs/SECURITY.md)
- [Performance & Database Optimization](docs/PERFORMANCE.md)
- [Code Structure & Patterns](docs/CODE-STRUCTURE.md)
- [Database Schema & Migrations](docs/DATABASE.md)
- [RBAC Matrix & Implementation](docs/RBAC.md)
- [Full Project Audit Report](.ai/PROJECT-AUDIT.md)

---

## License

Internal Enterprise Application — Tsehay Bank Core Banking Operations.
