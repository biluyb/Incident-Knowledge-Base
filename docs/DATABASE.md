# Database Schema & Migration Documentation

## Executive Overview

The database is powered by **PostgreSQL 16**. It stores historical core banking incidents, domain classifications, knowledge articles, attachments, comments, user accounts, and audit records.

---

## 1. Entity-Relationship Diagram Overview

```
[ groups ] 1 ─── N [ subtypes ] 1 ─── N [ tickets ] 1 ─── N [ incident_files ]
    │                      │                     │
    │ 1                    │ 1                   │ N
    ▼                      ▼                     ▼
[ knowledge_articles ] ◄───┴───────────────── [ ticket_articles ]
    │
    ├── 1 ─── N [ references_table ]
    ├── 1 ─── N [ contacts ]
    └── 1 ─── N [ kb_comments ]

[ users ] 1 ─── N [ audit_log ]
```

---

## 2. Table Specifications

### A. `groups`
Stores the top-level 8 technical incident domains (G01–G08).
- `id` (SERIAL PRIMARY KEY)
- `code` (VARCHAR(50) UNIQUE) — e.g. `G01`, `G02`
- `name` (VARCHAR(500)) — e.g. `COB & Batch Processing`
- `description` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

### B. `subtypes`
Stores the 30 subgroup categories within groups.
- `id` (SERIAL PRIMARY KEY)
- `code` (VARCHAR(50) UNIQUE) — e.g. `G01-SUB01`
- `name` (VARCHAR(500))
- `description` (TEXT)
- `group_id` (INT REFERENCES groups(id))

### C. `tickets`
Main table holding 237 historical incidents.
- `id` (SERIAL PRIMARY KEY)
- `reference` (VARCHAR(50) UNIQUE) — e.g. `TSR-3183311`
- `summary` (TEXT)
- `status` (VARCHAR(50)) — e.g. `Permanently Closed`
- `requester` (VARCHAR(255))
- `priority` (VARCHAR(20))
- `severity` (VARCHAR(20))
- `group_id` (INT REFERENCES groups(id))
- `subgroup_id` (INT REFERENCES subtypes(id))
- `custom_fields` (JSONB) — Group-specific dynamic fields
- `problem_symptoms`, `root_cause`, `diagnostic_information` (TEXT)
- `immediate_fix`, `permanent_fix`, `prevention`, `verification` (TEXT)
- `search_vector` (TSVECTOR) — Automatically populated for full-text search

### D. `knowledge_articles`
Structured resolution articles extracted from incidents or created by knowledge managers.
- `id` (SERIAL PRIMARY KEY)
- `title` (VARCHAR(500))
- `group_id` (INT REFERENCES groups(id))
- `subtype_id` (INT REFERENCES subtypes(id))
- `status` (VARCHAR(50)) — `published`, `draft`
- `symptoms`, `root_cause`, `diagnostic_data`, `immediate_fix`, `permanent_fix`, `prevention`, `verification` (TEXT)

### E. `kb_comments`
Discussion and notes attached to knowledge articles or groups.
- `id` (SERIAL PRIMARY KEY)
- `entity_type` (VARCHAR(50)) — `group`, `subtype`, `knowledge`
- `entity_id` (INT)
- `author` (VARCHAR(255))
- `body` (TEXT)
- `file_name`, `file_stored`, `file_size`, `file_type` (Attachment support)

### F. `users` & `audit_log`
- `users`: User authentication profiles (`email`, `password_hash`, `role`, `status`).
- `audit_log`: System activity log (`user_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at`).

---

## 3. Full-Text Search Vectors & Triggers

The `tickets` and `knowledge_articles` tables use automated trigger functions to keep `search_vector` up to date:

```sql
CREATE FUNCTION tickets_trigger() RETURNS trigger AS $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.reference,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.summary,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.problem_symptoms,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.root_cause,'')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.immediate_fix,'')), 'D');
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON tickets FOR EACH ROW EXECUTE FUNCTION tickets_trigger();
```

---

## 4. Migration Execution Procedure

When initializing a new environment or running schema upgrades:

1. `scripts/schema.sql` — Creates base tables, primary keys, and initial full-text indexes.
2. `scripts/migrate-comments.sql` — Creates comments schema and file storage columns.
3. `scripts/migrate-search-indexes.sql` — Enables `pg_trgm` extension and builds GiST trigram indexes.
