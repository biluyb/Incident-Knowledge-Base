# Code Structure & Developer Guide

## Executive Overview

This document serves as an onboarding map for developers maintaining or extending the Tsehay Bank Incident Knowledge Base codebase.

---

## 1. Directory Tree Overview

```
TCSP-Incident-Knowledge-Base/
├── .ai/                       # Architectural decisions & audit documents
├── docs/                      # Technical documentation suite
├── public/                    # Static assets & icons
├── scripts/                   # Database SQL schemas, migrations, and import utilities
│   ├── schema.sql             # Full DB schema
│   ├── migrate-comments.sql   # Comments table migration
│   ├── migrate-search-indexes.sql # Trigram index migration
│   └── import-xlsx.ts         # Excel data ingestion pipeline
└── src/                       # Application source code
    ├── app/                   # Next.js App Router (Pages & API Endpoints)
    │   ├── admin/             # Admin management console
    │   ├── api/               # Server API routes
    │   ├── groups/            # Group browser & details
    │   ├── incidents/         # Incident list, details, edit, new forms
    │   ├── knowledge/         # Knowledge base listing, details, new forms
    │   ├── login/             # Authentication login page
    │   ├── profile/           # Self-service user profile page
    │   ├── quick-lookup/      # Keyword mapping tool
    │   ├── search/            # Main search page
    │   ├── globals.css        # Tailwind 4 design system tokens
    │   ├── layout.tsx         # Root layout with AuthProvider & Sidebar
    │   ├── page.tsx           # Dashboard landing page
    │   └── proxy.ts           # Next.js 16 RBAC request proxy
    ├── components/            # React UI components
    │   ├── AuthProvider.tsx   # React Auth context & hooks
    │   ├── Navigation.tsx     # Responsive sidebar & mobile header
    │   └── ui/                # Reusable UI widgets
    │       ├── Badge.tsx      # Priority/Severity badge
    │       ├── CommentsSection.tsx # Knowledge base comments widget
    │       ├── CopyButton.tsx # Copy-to-clipboard button
    │       ├── FileUpload.tsx # File upload drag-and-drop widget
    │       ├── SearchBox.tsx  # Search input with live suggestion drop
    │       └── StatCard.tsx   # Dashboard stat container
    └── lib/                   # Utilities, DB pool, Types
        ├── api-auth.ts        # API route permission guards & audit logger
        ├── auth.ts            # User CRUD & password hashing helpers
        ├── db.ts              # PostgreSQL connection pool wrapper
        ├── permissions.ts     # System RBAC matrix & permissions definition
        ├── search.ts          # Multi-strategy search implementation
        └── types.ts           # Global TypeScript interface definitions
```

---

## 2. Standard Coding Conventions

### A. API Endpoints (`src/app/api/.../route.ts`)
- Every route MUST export `export const dynamic = 'force-dynamic';`.
- Every state-changing route MUST invoke `requirePermission(request, 'permission.name')`.
- All response objects MUST return standard JSON format with explicit HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500).

### B. Client Page Components (`src/app/.../page.tsx`)
- Client components using state or hooks must begin with `"use client";`.
- Any component using `useSearchParams()` MUST be wrapped in a `<Suspense>` boundary to ensure clean static prerendering during production builds.

### C. Styling Rules
- Use CSS variable tokens defined in `globals.css` (`var(--primary)`, `var(--secondary)`).
- Avoid inline hardcoded color values when standard utility classes (`bg-white`, `border-gray-200`, `text-gray-700`) or theme variables apply.

---

## 3. Key Helper Modules

| Helper | File | Primary Function |
|---|---|---|
| `query<T>()` | `src/lib/db.ts` | Executes parameterized SQL query returning array of records. |
| `queryOne<T>()` | `src/lib/db.ts` | Executes parameterized SQL query returning single record or null. |
| `requirePermission()` | `src/lib/api-auth.ts` | Verifies user JWT session and checks permission against matrix. |
| `auditLog()` | `src/lib/api-auth.ts` | Writes structured event into `audit_log` database table. |
| `search()` | `src/lib/search.ts` | Main search engine pipeline handler. |
