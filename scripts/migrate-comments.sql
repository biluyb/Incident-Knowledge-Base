-- Knowledge Base Comments
CREATE TABLE IF NOT EXISTS kb_comments (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('group', 'subtype', 'knowledge')),
  entity_id INTEGER NOT NULL,
  author VARCHAR(200) NOT NULL DEFAULT 'Anonymous',
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_comments_entity ON kb_comments(entity_type, entity_id);
