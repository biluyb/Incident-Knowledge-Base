-- ============================================================
-- Migration: Add Problem & Solution knowledge fields to tickets
-- Date: 2026-09-01
-- Purpose: Every incident needs its own Problem & Solution structure
-- ============================================================

-- Add the 9 knowledge fields to the tickets table
-- These fields allow each incident to store its own Problem & Solution information
-- independent of linked knowledge_articles

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS problem_symptoms TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS diagnostic_information TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS immediate_fix TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS permanent_fix TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS prevention TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS verification TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS temenos_contact TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN tickets.problem_symptoms IS 'Problem description and observed symptoms';
COMMENT ON COLUMN tickets.root_cause IS 'Technical root cause analysis';
COMMENT ON COLUMN tickets.diagnostic_information IS 'Commands, logs, or steps used to diagnose the issue';
COMMENT ON COLUMN tickets.immediate_fix IS 'Quick fix applied to resolve the immediate problem';
COMMENT ON COLUMN tickets.permanent_fix IS 'Permanent solution to prevent recurrence';
COMMENT ON COLUMN tickets.prevention IS 'Steps taken to prevent this issue in the future';
COMMENT ON COLUMN tickets.verification IS 'Steps to verify the fix is working correctly';
COMMENT ON COLUMN tickets.temenos_contact IS 'Temenos support contact for this issue';
COMMENT ON COLUMN tickets.notes IS 'Additional notes and context';

-- Update the search vector to include the new fields for full-text search
-- This ensures incidents can be found by their problem/solution content
CREATE OR REPLACE FUNCTION update_ticket_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.reference, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.root_cause_category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.problem_symptoms, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.root_cause, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.diagnostic_information, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.immediate_fix, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.permanent_fix, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.prevention, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.verification, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.status, '')), 'D');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS tickets_search_vector_update ON tickets;
CREATE TRIGGER tickets_search_vector_update
  BEFORE INSERT OR UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_search_vector();
