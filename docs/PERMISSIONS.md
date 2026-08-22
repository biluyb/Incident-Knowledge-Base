# Role-Based Access Control (RBAC) — Permission Matrix

## Overview

The Tsehay Bank Incident Knowledge Base uses a role-based access control system with four roles:

1. **ADMIN** — Full system access
2. **KNOWLEDGE_MANAGER** — Manage knowledge base and incidents
3. **CONTRIBUTOR** — Create and edit incidents, add comments
4. **VIEWER** — Read-only access

## Role Definitions

### ADMIN
- Full system access
- Manage users (create, edit, delete, change roles)
- Create/edit/delete Groups
- Create/edit/delete Subgroups
- Create/edit/delete Knowledge Base content
- Create/edit/delete incidents
- Manage incident attachments
- Manage comments (including delete any)
- View audit logs
- Cannot be removed as the last admin

### KNOWLEDGE_MANAGER
- Create/edit knowledge-base content
- Create/edit incidents
- Add solutions and technical instructions
- Add/edit comments
- Upload incident attachments
- Create Groups/Subgroups
- View audit logs
- Cannot manage users
- Cannot delete groups (admin only)

### CONTRIBUTOR
- Create incidents
- Edit incidents
- Add solutions/instructions
- Upload incident attachments
- Add comments
- Edit/delete own comments
- View Groups/Subgroups/Knowledge Base
- Cannot manage users
- Cannot delete groups/subgroups
- Cannot change system permissions

### VIEWER
- Search incidents
- View incidents
- View Groups/Subgroups
- Read Knowledge Base
- Read comments
- Cannot modify knowledge
- Cannot upload files
- Cannot create incidents
- Cannot manage users

## Permission Matrix

| Action | ADMIN | KNOWLEDGE_MANAGER | CONTRIBUTOR | VIEWER |
|--------|-------|-------------------|-------------|--------|
| **Incidents** | | | | |
| View incidents | ✅ | ✅ | ✅ | ✅ |
| Create incident | ✅ | ✅ | ✅ | ❌ |
| Edit incident | ✅ | ✅ | ✅ | ❌ |
| Delete incident | ✅ | ✅ | ❌ | ❌ |
| **Knowledge** | | | | |
| View knowledge | ✅ | ✅ | ✅ | ✅ |
| Create knowledge | ✅ | ✅ | ✅ | ❌ |
| Edit knowledge | ✅ | ✅ | ✅ | ❌ |
| Delete knowledge | ✅ | ✅ | ❌ | ❌ |
| **Groups** | | | | |
| Create group | ✅ | ✅ | ❌ | ❌ |
| Edit group | ✅ | ✅ | ❌ | ❌ |
| Delete group | ✅ | ❌ | ❌ | ❌ |
| **Subgroups** | | | | |
| Create subgroup | ✅ | ✅ | ❌ | ❌ |
| Edit subgroup | ✅ | ✅ | ❌ | ❌ |
| Delete subgroup | ✅ | ❌ | ❌ | ❌ |
| **Files** | | | | |
| Upload attachment | ✅ | ✅ | ✅ | ❌ |
| Delete attachment | ✅ | ✅ | ✅* | ❌ |
| **Comments** | | | | |
| Add comment | ✅ | ✅ | ✅ | ❌ |
| Edit own comment | ✅ | ✅ | ✅ | ❌ |
| Delete own comment | ✅ | ✅ | ✅ | ❌ |
| Delete any comment | ✅ | ✅ | ❌ | ❌ |
| **Users** | | | | |
| Manage users | ✅ | ❌ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ |
| **Audit** | | | | |
| View audit logs | ✅ | ✅ | ❌ | ❌ |

*Contributors can only delete their own attachments

## Authentication

- JWT-based sessions stored in httpOnly cookies
- Session duration: 24 hours
- Password hashing: bcrypt (12 rounds)
- All protected API endpoints require authentication

## Authorization Enforcement

1. **Backend**: All API routes verify authentication and permissions server-side
2. **Middleware**: Next.js middleware protects routes based on URL patterns
3. **Frontend**: UI elements are conditionally rendered based on user role (UX only — not security)

## Security Notes

- Frontend permission checks are for UX only — backend is the security boundary
- Users cannot grant themselves admin privileges
- Last admin cannot be removed or have their role changed
- Audit logging tracks all significant actions
- Session cookies are httpOnly, secure (in production), and sameSite=lax

## Creating the First Admin

Run the following command to create the initial admin user:

```bash
npm run create-admin "Admin Name" "admin@tsehaybank.com" "SecurePassword123"
```

Or use defaults:

```bash
npm run create-admin
```

Default credentials:
- Email: admin@tsehaybank.com
- Password: Admin@2026

**Change the password immediately in production!**

## API Endpoints

### Public (no auth required)
- `GET /api/search` — Search
- `GET /api/groups` — List groups
- `GET /api/stats` — Dashboard stats
- `GET /api/keywords` — Keywords
- `GET /api/incidents` — List incidents (read-only)
- `GET /api/knowledge` — List knowledge articles (read-only)

### Protected (auth required)
- `POST /api/incidents` — Create incident
- `PUT /api/incidents/:id` — Edit incident
- `POST /api/knowledge` — Create knowledge
- `PUT /api/knowledge/:id` — Edit knowledge
- `POST /api/files` — Upload file
- `DELETE /api/files/:id` — Delete file
- `POST /api/comments` — Add comment
- `DELETE /api/comments/:id` — Delete comment

### Admin only
- `POST /api/admin/groups` — Create group
- `PUT /api/admin/groups/:id` — Edit group
- `DELETE /api/admin/groups/:id` — Delete group
- `POST /api/admin/subgroups` — Create subgroup
- `PUT /api/admin/subgroups/:id` — Edit subgroup
- `DELETE /api/admin/subgroups/:id` — Delete subgroup
- `GET /api/users` — List users
- `POST /api/users` — Create user
- `PUT /api/users/:id` — Edit user
- `DELETE /api/users/:id` — Delete user
- `GET /api/audit` — View audit logs
