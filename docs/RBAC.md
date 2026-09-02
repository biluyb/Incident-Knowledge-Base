# Role-Based Access Control (RBAC) Specification

## Executive Overview

The Tsehay Bank Incident Knowledge Base relies on a role-based access control architecture. Every user belongs to one of four hierarchical roles. Authorization boundaries are enforced on both client-side navigation UI and server-side API endpoints.

---

## 1. User Roles Overview

1. **Admin (`admin`)**: System administrator with complete authority. Manages user accounts, assigns roles, edits core taxonomy (groups/subgroups), manages incidents and knowledge base, views audit logs, and deletes any resource.
2. **Knowledge Manager (`knowledge_manager`)**: Technical lead or senior engineer responsible for knowledge curation. Can publish and edit knowledge articles, manage incident entries, create groups/subgroups, upload attachments, and view audit logs.
3. **Contributor (`contributor`)**: Core banking engineer or support specialist. Can record new incidents, edit existing incidents, create draft knowledge articles, post comments, attach diagnostic log files, and edit/delete their own comments.
4. **Viewer (`viewer`)**: Read-only user (e.g. audit team, junior operator). Can search historical incidents, view group classifications, read knowledge articles, and download log attachments. Cannot create, modify, or delete any system records.

---

## 2. Permission Codes & Mapping Matrix

| Permission Code | Description | Admin | Knowledge Manager | Contributor | Viewer |
|---|---|:---:|:---:|:---:|:---:|
| `incident.view` | View historical incident entries | ✅ | ✅ | ✅ | ✅ |
| `incident.create` | Document new historical incident | ✅ | ✅ | ✅ | ❌ |
| `incident.edit` | Update existing incident details | ✅ | ✅ | ✅ | ❌ |
| `incident.delete` | Delete an incident entry | ✅ | ✅ | ❌ | ❌ |
| `knowledge.view` | Read knowledge base articles | ✅ | ✅ | ✅ | ✅ |
| `knowledge.create` | Create new knowledge base article | ✅ | ✅ | ✅ | ❌ |
| `knowledge.edit` | Update knowledge base article | ✅ | ✅ | ❌ | ❌ |
| `knowledge.delete` | Delete knowledge base article | ✅ | ✅ | ❌ | ❌ |
| `group.view` | View groups and subgroups | ✅ | ✅ | ✅ | ✅ |
| `group.create` | Create new incident group domain | ✅ | ✅ | ❌ | ❌ |
| `group.edit` | Edit group details | ✅ | ✅ | ❌ | ❌ |
| `group.delete` | Delete empty incident group | ✅ | ❌ | ❌ | ❌ |
| `subtype.view` | View subgroup categories | ✅ | ✅ | ✅ | ✅ |
| `subtype.create` | Create new subgroup | ✅ | ✅ | ❌ | ❌ |
| `subtype.edit` | Edit subgroup details | ✅ | ✅ | ❌ | ❌ |
| `subtype.delete` | Delete empty subgroup | ✅ | ❌ | ❌ | ❌ |
| `file.view` | Download and view log attachments | ✅ | ✅ | ✅ | ✅ |
| `file.upload` | Attach diagnostic logs / files | ✅ | ✅ | ✅ | ❌ |
| `file.delete` | Remove file attachments | ✅ | ✅ | ✅ | ❌ |
| `comment.view` | Read comments on articles/groups | ✅ | ✅ | ✅ | ✅ |
| `comment.create` | Post comment / discussion note | ✅ | ✅ | ✅ | ❌ |
| `comment.delete_own` | Delete own comments | ✅ | ✅ | ✅ | ❌ |
| `comment.delete_any` | Delete any user comment | ✅ | ✅ | ❌ | ❌ |
| `user.view` | View user accounts list | ✅ | ❌ | ❌ | ❌ |
| `user.manage` | Create, edit status, delete users | ✅ | ❌ | ❌ | ❌ |
| `audit.view` | Inspect system audit log | ✅ | ✅ | ❌ | ❌ |

---

## 3. Server-Side Protection Implementation

### Edge Middleware (`src/proxy.ts`)
Interprets route access requirements before hitting server components:
```ts
const PROTECTED_ROUTES = [
  { prefix: '/admin', roles: ['admin', 'knowledge_manager'] },
  { prefix: '/incidents/new', roles: ['admin', 'knowledge_manager', 'contributor'] },
  { prefix: '/knowledge/new', roles: ['admin', 'knowledge_manager', 'contributor'] },
  { prefix: '/profile', roles: ['admin', 'knowledge_manager', 'contributor', 'viewer'] },
];
```

### API Authorization Guard (`src/lib/api-auth.ts`)
Explicit check inside every API handler:
```ts
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'incident.create');
  if (auth.error) return auth.error;
  // Handler logic...
}
```

---

## 4. Administrative Safety Controls

- **Last Admin Protection (`canRemoveAdmin`)**: The system queries the database before any role change or account deletion. If the target user is the sole active Administrator account, the operation is blocked with HTTP 409 Conflict.
- **Self-Deletion Guard**: Administrators cannot delete their own active session account.
