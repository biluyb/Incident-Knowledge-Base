// ============================================================
// Core Data Types
// ============================================================

export interface Group {
  id: number;
  code: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  ticket_count?: number;
  article_count?: number;
  subtype_count?: number;
}

export interface Subtype {
  id: number;
  code: string;
  name: string;
  description: string | null;
  group_id: number;
  created_at: Date;
  updated_at: Date;
  group?: Group;
}

export interface Ticket {
  id: number;
  reference: string;
  summary: string | null;
  status: string | null;
  requester: string | null;
  created_at_ticket: string | null;
  resolved_at: string | null;
  permanently_closed_at: string | null;
  root_cause_category: string | null;
  priority: string | null;
  severity: string | null;
  group_id: number | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  group?: Group;
  related_articles?: KnowledgeArticle[];
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  group_id: number;
  subtype_id: number | null;
  status: 'draft' | 'review' | 'published' | 'deprecated';
  symptoms: string | null;
  root_cause: string | null;
  diagnostic_data: string | null;
  immediate_fix: string | null;
  permanent_fix: string | null;
  prevention: string | null;
  verification: string | null;
  temenos_contact: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  group?: Group;
  subtype?: Subtype;
  related_tickets?: Ticket[];
  references?: Reference[];
  contacts?: Contact[];
}

export interface Keyword {
  id: number;
  keyword: string;
  group_id: number | null;
  article_id: number | null;
  weight: number;
  created_at: Date;
  updated_at: Date;
}

export interface Reference {
  id: number;
  article_id: number | null;
  title: string | null;
  url: string | null;
  reference_type: string | null;
  description: string | null;
}

export interface Contact {
  id: number;
  article_id: number | null;
  name: string | null;
  email: string | null;
  teams: string | null;
  phone: string | null;
  notes: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'engineer' | 'viewer';
  status: string;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: Date;
}

// ============================================================
// Search Types
// ============================================================

export interface SearchResult {
  type: 'knowledge' | 'ticket';
  id: number;
  title: string;
  summary?: string;
  group_code?: string;
  group_name?: string;
  subtype_code?: string;
  severity?: string;
  priority?: string;
  score: number;
  highlights?: Record<string, string>;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

// ============================================================
// Stats Types
// ============================================================

export interface DashboardStats {
  total_tickets: number;
  total_groups: number;
  total_articles: number;
  total_subtypes: number;
  total_keywords: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  group_distribution: { code: string; name: string; count: number }[];
  root_cause_distribution: { category: string; count: number }[];
  status_distribution: { status: string; count: number }[];
}

// ============================================================
// Filter Types
// ============================================================

export interface SearchFilters {
  group?: string;
  priority?: string;
  severity?: string;
  status?: string;
  root_cause?: string;
  sort?: 'relevance' | 'newest' | 'oldest' | 'priority' | 'severity';
}
