-- ============================================================
-- Migration: Add trigram indexes on new knowledge fields
-- Date: 2026-09-01
-- Purpose: Enable typo-tolerant search on problem_symptoms and root_cause
-- ============================================================

-- Trigram indexes for typo-tolerant search on new knowledge fields
CREATE INDEX IF NOT EXISTS idx_tickets_problem_symptoms_trgm
  ON tickets USING GIN(problem_symptoms gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tickets_root_cause_trgm
  ON tickets USING GIN(root_cause gin_trgm_ops);
