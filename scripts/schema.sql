-- ============================================================
-- TCSP Incident Knowledge Base — Database Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Groups — 8 official incident domains
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  legacy_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Subtypes — 30 subgroups within groups
-- ============================================================
CREATE TABLE IF NOT EXISTS subtypes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  group_id INTEGER NOT NULL REFERENCES groups(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Tickets — 237 historical incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  reference VARCHAR(50) UNIQUE NOT NULL,
  summary TEXT,
  status VARCHAR(50),
  requester VARCHAR(100),
  created_at_ticket TEXT,
  resolved_at TEXT,
  permanently_closed_at TEXT,
  root_cause_category VARCHAR(200),
  priority VARCHAR(20),
  severity VARCHAR(20),
  group_id INTEGER REFERENCES groups(id),
  subgroup_id INTEGER,
  classification_confidence VARCHAR(20),
  classification_note TEXT,
  legacy_group VARCHAR(50),
  custom_fields JSONB DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Knowledge Articles — reusable solutions
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  group_id INTEGER REFERENCES groups(id),
  subtype_id INTEGER REFERENCES subtypes(id),
  status VARCHAR(20) DEFAULT 'published',
  symptoms TEXT,
  root_cause TEXT,
  diagnostic_data TEXT,
  immediate_fix TEXT,
  permanent_fix TEXT,
  prevention TEXT,
  verification TEXT,
  temenos_contact TEXT,
  notes TEXT,
  search_vector TSVECTOR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Keywords — quick lookup terms
-- ============================================================
CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(200) NOT NULL,
  group_id INTEGER REFERENCES groups(id),
  article_id INTEGER,
  weight INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- References — external links
-- ============================================================
CREATE TABLE IF NOT EXISTS references_table (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES knowledge_articles(id),
  title VARCHAR(500),
  url TEXT,
  reference_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Contacts — engineer contacts
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES knowledge_articles(id),
  name VARCHAR(200),
  email VARCHAR(200),
  teams TEXT,
  phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Ticket-Article relationships
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_articles (
  ticket_id INTEGER REFERENCES tickets(id),
  article_id INTEGER REFERENCES knowledge_articles(id),
  PRIMARY KEY (ticket_id, article_id)
);

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(20) DEFAULT 'viewer',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- ============================================================
-- Audit Log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Search Analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS search_analytics (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_tickets_search ON tickets USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_articles_search ON knowledge_articles USING GIN(search_vector);

-- Trigram indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_tickets_summary_trgm ON tickets USING GIN(summary gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON knowledge_articles USING GIN(title gin_trgm_ops);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_tickets_reference ON tickets(reference);
CREATE INDEX IF NOT EXISTS idx_tickets_group ON tickets(group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_subgroup ON tickets(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_severity ON tickets(severity);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_legacy_group ON tickets(legacy_group);
CREATE INDEX IF NOT EXISTS idx_tickets_class_conf ON tickets(classification_confidence);
CREATE INDEX IF NOT EXISTS idx_subtypes_group ON subtypes(group_id);
CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_group ON keywords(group_id);

-- ============================================================
-- Functions for search
-- ============================================================

-- Update ticket search vector
CREATE OR REPLACE FUNCTION update_ticket_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.reference, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.root_cause_category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.status, '')), 'D');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tickets_search_vector_update ON tickets;
CREATE TRIGGER tickets_search_vector_update
  BEFORE INSERT OR UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_search_vector();

-- Update article search vector
CREATE OR REPLACE FUNCTION update_article_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.symptoms, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.root_cause, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.immediate_fix, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.permanent_fix, '')), 'C');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_search_vector_update ON knowledge_articles;
CREATE TRIGGER articles_search_vector_update
  BEFORE INSERT OR UPDATE ON knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION update_article_search_vector();

-- ============================================================
-- Incident Files — file attachments for incidents
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_files (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(200) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) DEFAULT 'application/octet-stream',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incident_files_ticket ON incident_files(ticket_id);
