# Security Controls & Policy Documentation

## Executive Overview

Security is a foundational pillar of the Tsehay Bank Incident Knowledge Base. This document details the security controls, authentication mechanisms, authorization boundaries, input sanitization rules, and audit trails implemented across the system.

---

## 1. Authentication & Session Management

- **Technology:** JWT (JSON Web Tokens) using `jose`.
- **Session Duration:** 24 Hours.
- **Storage:** `httpOnly`, `sameSite=lax`, `path=/` cookies.
- **Password Hashing:** `bcryptjs` with 12 salt rounds.
- **Self-Service:** Self-service profile updates and password changes enforce current password verification.
- **Protection:** Prevents removing or deleting the last system administrator account (`canRemoveAdmin` check).

---

## 2. Role-Based Access Control (RBAC) Matrix

The system implements 4 distinct roles:

```
[ Admin ] ──► [ Knowledge Manager ] ──► [ Contributor ] ──► [ Viewer ]
```

| Domain | Permission | Admin | Knowledge Manager | Contributor | Viewer |
|---|---|:---:|:---:|:---:|:---:|
| **Incidents** | `incident.view` | ✅ | ✅ | ✅ | ✅ |
| | `incident.create` | ✅ | ✅ | ✅ | ❌ |
| | `incident.edit` | ✅ | ✅ | ✅ | ❌ |
| | `incident.delete` | ✅ | ✅ | ❌ | ❌ |
| **Knowledge Base** | `knowledge.view` | ✅ | ✅ | ✅ | ✅ |
| | `knowledge.create` | ✅ | ✅ | ✅ | ❌ |
| | `knowledge.edit` | ✅ | ✅ | ❌ | ❌ |
| | `knowledge.delete` | ✅ | ✅ | ❌ | ❌ |
| **Comments & Files**| `comment.create` | ✅ | ✅ | ✅ | ❌ |
| | `comment.delete_own`| ✅ | ✅ | ✅ | ❌ |
| | `comment.delete_any`| ✅ | ✅ | ❌ | ❌ |
| | `file.upload` | ✅ | ✅ | ✅ | ❌ |
| | `file.view` | ✅ | ✅ | ✅ | ✅ |
| **Admin** | `user.view` | ✅ | ❌ | ❌ | ❌ |
| | `user.manage` | ✅ | ❌ | ❌ | ❌ |
| | `audit.view` | ✅ | ✅ | ❌ | ❌ |

---

## 3. Defense-in-Depth Enforcement

Authorization is verified at **two independent layers**:

1. **Proxy Middleware Layer (`src/proxy.ts`)**: Intercepts requests before route execution. Checks user session and route access requirements.
2. **API Handler Layer (`src/lib/api-auth.ts`)**: Every API endpoint explicitly invokes `requirePermission(request, 'permission.name')`. If invalid, returns HTTP 401 Unauthenticated or HTTP 403 Forbidden.

---

## 4. Vulnerability Countermeasures

### A. SQL Injection Prevention
- **Rule:** ALL SQL queries MUST use parameterized place-holders (`$1, $2, $3`).
- **Status:** Verified 100% compliant across all `src/lib/db.ts` calls.

### B. Path Traversal & File Upload Exploits
- **Upload Restrictions:**
  - Max File Size: 10MB (`MAX_SIZE = 10 * 1024 * 1024`).
  - Whitelisted Extensions: `.png, .jpeg, .jpg, .gif, .webp, .pdf, .txt, .csv, .xml, .json, .doc, .docx, .xls, .xlsx, .zip, .log, .sql`.
  - Storage Naming: `<timestamp>-<random_hex>.<ext>` stored outside public root.
- **Download Protection:** Downloads sanitize requested file names using `path.basename()` to eliminate directory traversal attacks (`../../etc/passwd`).

### C. Cross-Site Scripting (XSS)
- React automatically escapes all string expressions rendered in TSX.
- Rich-text fields in Markdown viewer are escaped and rendered as sanitized text nodes.

---

## 5. Audit Logging Policy

All state-changing operations (Create, Update, Delete) write an entry to the `audit_log` table:

- `user_id`: ID of acting user.
- `action`: E.g. `incident.create`, `user.role_change`, `file.delete`.
- `entity_type`: `incident`, `knowledge`, `user`, `group`, `file`, `comment`.
- `entity_id`: Primary key of affected record.
- `details`: Human-readable description of change.
- `created_at`: Timestamp.

Audit logs are visible to Administrators and Knowledge Managers at `/admin` (Audit Log tab).
