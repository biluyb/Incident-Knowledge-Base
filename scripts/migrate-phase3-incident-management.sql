-- ====================================================================
-- Core Systems Hub — Phase 3: Incident Management Migration
-- Enhancements for Internal Ownership, Lifecycle History, and Temenos Tracking
-- ====================================================================

-- 1. Enhance tickets table (Non-destructive, idempotent)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS internal_owner VARCHAR(150);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS temenos_status VARCHAR(50);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS temenos_response_date DATE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS temenos_reported_date DATE;

-- 2. Incident Status & Assignment History Table
CREATE TABLE IF NOT EXISTS incident_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) DEFAULT 'status_change', -- 'status_change', 'reassigned', 'investigation_note'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_history_ticket ON incident_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_temenos_status ON tickets(temenos_status);

