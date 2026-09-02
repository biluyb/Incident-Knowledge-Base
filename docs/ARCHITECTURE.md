# Technical Architecture Documentation

## Executive Overview

The Tsehay Bank Incident Knowledge Base is built as a high-performance, self-contained enterprise Web Application. It is designed to catalog, search, and analyze historical T24/Temenos core banking incidents and provide engineers with immediate, actionable diagnostic procedures and resolution workflows.

---

## 1. System Context Diagram

```
[ Web Browser ]
      │
      │ HTTP (JWT Cookie / Authorization Header)
      ▼
[ Next.js Middleware (src/proxy.ts) ]
      │
      ├── (Page Request) ──────► [ Server Pages / App Router Components ]
      │                                    │
      └── (API Request) ───────► [ Next.js API Routes (src/app/api/*) ]
                                           │
                                  [ Permission Guard (src/lib/api-auth.ts) ]
                                           │
                                  [ Database Helper (src/lib/db.ts) ]
                                           │
                                  [ PostgreSQL 16 Database Pool ]
```

---

## 2. Key Technology Choices & Rationale

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server-Side Rendering (SSR) for initial loads, static optimization for public pages, built-in API routing. |
| DB Connectivity | `pg` Driver (Pool) | Lightweight, low overhead, no ORM abstraction layer, full access to PostgreSQL-native full-text and trigram functions. |
| Authentication | JWT via `jose` | Stateless token verification with zero DB round-trips for session authentication. |
| Search | Native Postgres Full-Text + `pg_trgm` | High performance without external dependencies (e.g. Elasticsearch or Solr). |
| Dynamic Fields | `JSONB` | Flexible storage for domain-specific incident fields without altering database schema per group. |

---

## 3. Request Lifecycle & Security Guards

1. **Client Request**: Client sends GET/POST request with HTTP-Only JWT Cookie (`auth_token`).
2. **Edge Route Protection (`src/proxy.ts`)**:
   - Parses JWT.
   - Verifies expiration and signature.
   - Enforces page-level RBAC (redirects unauthenticated users to `/login`).
   - Injects authenticated user state into headers (`x-user-id`, `x-user-role`, `x-user-email`).
3. **API Handler Enforcement (`src/lib/api-auth.ts`)**:
   - Call `requirePermission(request, 'permission.code')`.
   - Validates user role against permission matrix.
   - Executes audit logging (`auditLog()`) for state-changing operations.
4. **Data Access Layer (`src/lib/db.ts`)**:
   - Executes parameterized query via standard pool.
   - Returns typed JavaScript objects to client.

---

## 4. Search Pipeline Architecture

The search engine implements a multi-stage fallback strategy to achieve high accuracy and typo-tolerance:

```
                  ┌─────────────────────────────────┐
                  │          Search Query           │
                  └─────────────────────────────────┘
                                   │
                Is Query an exact TSR Reference?
                        /               \
                      YES                NO
                      /                   \
        Return Ticket Match         Run Full-Text Search
                                    (`tickets.search_vector`)
                                            │
                                  Results Count > 0 ?
                                       /         \
                                     YES          NO
                                     /             \
                           Return Hits         Run Trigram Similarity
                                               (`pg_trgm` on summary & title)
                                                       │
                                             Results Count > 0 ?
                                                 /         \
                                               YES          NO
                                               /             \
                                     Return Hits         ILIKE Keyword Fallback
```

---

## 5. File Upload & Attachment Storage

- Files are stored on disk in the application `uploads/` directory.
- Database records original name, randomized stored name (`<timestamp>-<hash>.<ext>`), file size, and MIME type in `incident_files` or `kb_comments`.
- Download endpoint (`/api/files/[id]/download`) verifies authentication and permission before piping stream to client with sanitized Content-Disposition headers.

---

## 6. Maintenance & Extensibility Guidelines

- **Adding a new permission**: Update `PERMISSIONS` object in `src/lib/permissions.ts` and `src/components/AuthProvider.tsx`.
- **Adding a new incident group**: Insert row into `groups` table. The dynamic form builder automatically reads options from database.
- **Adding a new dynamic field**: Update `custom_fields` JSON schema in client form components without altering DB tables.
