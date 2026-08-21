-- Add trigram indexes for typo-tolerant search
CREATE INDEX IF NOT EXISTS idx_tickets_summary_trgm ON tickets USING GIN(summary gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_reference_trgm ON tickets USING GIN(reference gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_root_cause_trgm ON tickets USING GIN(root_cause_category gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON knowledge_articles USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_symptoms_trgm ON knowledge_articles USING GIN(symptoms gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_root_cause_trgm ON knowledge_articles USING GIN(root_cause gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_subtypes_name_trgm ON subtypes USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_groups_name_trgm ON groups USING GIN(name gin_trgm_ops);
