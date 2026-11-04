-- ====================================================================
-- Core Systems Hub — Foundation Migration
-- Phase 1: Database Architecture & Domain Entities
-- Organization: Tsehay Bank | Department: Core Systems
-- ====================================================================

-- 1. Custom Types & State Enums (Idempotent)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'article_status') THEN
        CREATE TYPE article_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
        CREATE TYPE incident_status AS ENUM ('new', 'assigned', 'investigating', 'waiting_for_temenos', 'waiting_for_internal_team', 'resolved', 'closed', 'reopened', 'escalated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daily_report_status') THEN
        CREATE TYPE daily_report_status AS ENUM ('draft', 'submitted', 'under_review', 'returned', 'approved');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
        CREATE TYPE project_status AS ENUM ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'blocked', 'under_review', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'escalation_status') THEN
        CREATE TYPE escalation_status AS ENUM ('open', 'acknowledged', 'under_review', 'action_required', 'waiting_for_response', 'resolved', 'closed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
        CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');
    END IF;
END $$;

-- 2. Teams Table & Users Table Enhancements
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    lead_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Core Systems';
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL;

-- 3. Knowledge Base Extensions (Categories & Versions)
CREATE TABLE IF NOT EXISTS knowledge_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed default knowledge categories from SRS §3.2 if not present
INSERT INTO knowledge_categories (name, code, description) VALUES
    ('Temenos T24 / Transact', 'T24', 'Core banking transaction processing and setup'),
    ('AA / Arrangements', 'AA', 'Arrangement Architecture accounts, products and conditions'),
    ('COB / EOD / SOD', 'COB', 'Close of Business, End of Day, and Start of Day batches'),
    ('TAFJ / JBoss', 'TAFJ', 'Application framework, runtime, and server configuration'),
    ('Oracle Database', 'ORACLE', 'Database administration, SQL tuning, and tablespaces'),
    ('FCM / AML', 'FCM', 'Financial Crime Mitigation, screening and compliance'),
    ('Integration and APIs', 'APIS', 'Web services, integration adapters, and payment gateways'),
    ('Payments and Transfers', 'PAYMENTS', 'RTGS, ACH, internal transfers, and SWIFT'),
    ('Interest and Loans', 'LOANS', 'Accruals, schedules, disbursements, and loan lifecycles'),
    ('System Administration', 'SYSADMIN', 'Security, permissions, platform maintenance'),
    ('Projects and Implementations', 'PROJECTS', 'Project guides, upgrade procedures, and rollouts'),
    ('Troubleshooting and Known Errors', 'ERRORS', 'Standard error diagnosis and operational fixes')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS knowledge_versions (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    content_snapshot JSONB NOT NULL,
    modified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(article_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_versions_article ON knowledge_versions(article_id);

-- 4. Projects & Milestones
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    business_objective TEXT,
    sponsor VARCHAR(200),
    manager_id INTEGER NOT NULL REFERENCES users(id),
    start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_end_date DATE,
    priority priority_level DEFAULT 'medium',
    status project_status DEFAULT 'planned',
    progress_percentage NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_project VARCHAR(100) DEFAULT 'Member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    completed_date DATE,
    weight INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);

-- 5. Tasks & Dependencies
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_code VARCHAR(50) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    assigned_by INTEGER NOT NULL REFERENCES users(id),
    assigned_to INTEGER REFERENCES users(id),
    start_date DATE,
    due_date DATE,
    priority priority_level DEFAULT 'medium',
    status task_status DEFAULT 'todo',
    progress_percentage INTEGER DEFAULT 0,
    related_ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    completion_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- 6. Daily Reports & Activities
CREATE TABLE IF NOT EXISTS daily_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    report_date DATE NOT NULL,
    status daily_report_status DEFAULT 'draft',
    reviewer_id INTEGER REFERENCES users(id),
    reviewer_comments TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, report_date)
);

CREATE TABLE IF NOT EXISTS daily_activities (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    work_performed TEXT NOT NULL,
    result_outcome TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    challenges TEXT,
    next_action TEXT,
    hours_spent NUMERIC(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date ON daily_reports(user_id, report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON daily_reports(status);
CREATE INDEX IF NOT EXISTS idx_daily_activities_report ON daily_activities(report_id);

-- 7. Escalations & Escalation Actions
CREATE TABLE IF NOT EXISTS escalations (
    id SERIAL PRIMARY KEY,
    escalation_code VARCHAR(50) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    escalation_type VARCHAR(50) NOT NULL, -- 'incident', 'task', 'project', 'blocker'
    source_incident_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
    source_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    source_project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    raised_by INTEGER NOT NULL REFERENCES users(id),
    current_owner_id INTEGER REFERENCES users(id),
    escalated_to_id INTEGER NOT NULL REFERENCES users(id),
    escalation_level INTEGER DEFAULT 1, -- 1=Team Lead, 2=Dept Manager, 3=Director
    reason TEXT NOT NULL,
    business_impact TEXT NOT NULL,
    required_response_date DATE,
    decision_action TEXT,
    resolution_notes TEXT,
    status escalation_status DEFAULT 'open',
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escalation_actions (
    id SERIAL PRIMARY KEY,
    escalation_id INTEGER NOT NULL REFERENCES escalations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL, -- 'acknowledged', 'note', 'reassigned', 'resolved'
    action_note TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_escalated_to ON escalations(escalated_to_id);
CREATE INDEX IF NOT EXISTS idx_escalations_raised_by ON escalations(raised_by);
CREATE INDEX IF NOT EXISTS idx_escalation_actions_escalation ON escalation_actions(escalation_id);

-- 8. Add Audit Log Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- 9. Add Missing Foreign Key Constraints Safely
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_tickets_subgroup' AND table_name = 'tickets'
    ) THEN
        ALTER TABLE tickets ADD CONSTRAINT fk_tickets_subgroup 
        FOREIGN KEY (subgroup_id) REFERENCES subtypes(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_keywords_article' AND table_name = 'keywords'
    ) THEN
        ALTER TABLE keywords ADD CONSTRAINT fk_keywords_article 
        FOREIGN KEY (article_id) REFERENCES knowledge_articles(id) ON DELETE CASCADE;
    END IF;
END $$;

