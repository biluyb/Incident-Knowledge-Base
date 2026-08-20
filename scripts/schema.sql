-- Incident Knowledge Base - PostgreSQL Schema
-- Run: psql -d tcsp_incident_kb -f scripts/schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,          -- COB-BATCH, ACCT-LIFECYCLE, etc.
    name VARCHAR(500) NOT NULL,
    description TEXT,
    legacy_code VARCHAR(50),                   -- Original A-J code from Excel
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_code ON groups(code);

-- ============================================================
-- SUBTYPES
-- ============================================================
CREATE TABLE IF NOT EXISTS subtypes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,          -- ST-E1, ST-E2, etc.
    name VARCHAR(500) NOT NULL,
    description TEXT,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subtypes_group ON subtypes(group_id);
CREATE INDEX IF NOT EXISTS idx_subtypes_code ON subtypes(code);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,     -- TSR-3183311
    summary TEXT,
    status VARCHAR(100),
    requester VARCHAR(200),
    created_at_ticket DATE,
    resolved_at DATE,
    permanently_closed_at DATE,
    root_cause_category VARCHAR(300),
    priority VARCHAR(50),
    severity VARCHAR(50),
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    custom_fields JSONB DEFAULT '{}',
    -- Full text search vector
    search_vector TSVECTOR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_reference ON tickets(reference);
CREATE INDEX IF NOT EXISTS idx_tickets_group ON tickets(group_id);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_severity ON tickets(severity);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_root_cause ON tickets(root_cause_category);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at_ticket);
CREATE INDEX IF NOT EXISTS idx_tickets_search ON tickets USING GIN(search_vector);

-- ============================================================
-- KNOWLEDGE ARTICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    subtype_id INTEGER REFERENCES subtypes(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'draft',       -- draft, review, published, deprecated
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

CREATE INDEX IF NOT EXISTS idx_articles_group ON knowledge_articles(group_id);
CREATE INDEX IF NOT EXISTS idx_articles_subtype ON knowledge_articles(subtype_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON knowledge_articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_search ON knowledge_articles USING GIN(search_vector);

-- ============================================================
-- KEYWORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(300) NOT NULL,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    weight INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keywords_keyword ON keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_keywords_group ON keywords(group_id);
CREATE INDEX IF NOT EXISTS idx_keywords_article ON keywords(article_id);

-- ============================================================
-- TICKET-KEYWORD RELATIONSHIP
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_keywords (
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (ticket_id, keyword_id)
);

-- ============================================================
-- ARTICLE-KEYWORD RELATIONSHIP
-- ============================================================
CREATE TABLE IF NOT EXISTS article_keywords (
    article_id INTEGER NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, keyword_id)
);

-- ============================================================
-- TICKET-ARTICLE RELATIONSHIP (Related tickets <-> knowledge)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_articles (
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    confidence REAL DEFAULT 1.0,
    PRIMARY KEY (ticket_id, article_id)
);

-- ============================================================
-- REFERENCES (External links)
-- ============================================================
CREATE TABLE IF NOT EXISTS references_table (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    title VARCHAR(500),
    url TEXT,
    reference_type VARCHAR(100),              -- Basecamp, Store, Teams, Document
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_references_article ON references_table(article_id);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    name VARCHAR(200),
    email VARCHAR(200),
    teams VARCHAR(200),
    phone VARCHAR(100),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_contacts_article ON contacts(article_id);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(500) NOT NULL,
    role VARCHAR(30) DEFAULT 'engineer',      -- admin, engineer, viewer
    status VARCHAR(30) DEFAULT 'active',      -- active, disabled
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, article_id)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,             -- create, update, delete, import
    entity_type VARCHAR(100),                 -- article, group, keyword, user
    entity_id INTEGER,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ============================================================
-- SEARCH ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    searched_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_date ON search_analytics(searched_at);

-- ============================================================
-- FUNCTIONS: Auto-update search vectors
-- ============================================================

-- Function to update ticket search vector
CREATE OR REPLACE FUNCTION update_ticket_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.reference, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.root_cause_category, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ticket_search_vector ON tickets;
CREATE TRIGGER trg_ticket_search_vector
    BEFORE INSERT OR UPDATE OF reference, summary, root_cause_category
    ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_search_vector();

-- Function to update knowledge article search vector
CREATE OR REPLACE FUNCTION update_article_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.symptoms, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.root_cause, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.diagnostic_data, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.immediate_fix, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.permanent_fix, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_article_search_vector ON knowledge_articles;
CREATE TRIGGER trg_article_search_vector
    BEFORE INSERT OR UPDATE OF title, symptoms, root_cause, diagnostic_data, immediate_fix, permanent_fix
    ON knowledge_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_article_search_vector();
