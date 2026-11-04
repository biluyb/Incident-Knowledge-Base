// ============================================================
// Core Data Types — Core Systems Hub
// ============================================================

export interface Group {
  id: number;
  code: string;
  name: string;
  description: string | null;
  legacy_code?: string | null;
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
  subgroup_id: number | null;
  classification_confidence: string | null;
  classification_note: string | null;
  legacy_group: string | null;
  custom_fields?: Record<string, string>;
  // Problem & Solution knowledge fields
  problem_symptoms: string | null;
  root_cause: string | null;
  diagnostic_information: string | null;
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
  subgroup?: Subtype;
  group_code?: string;
  group_name?: string;
  subgroup_name?: string;
  subgroup_code?: string;
  related_articles?: KnowledgeArticle[];
  similar_incidents?: Ticket[];
}

export interface KnowledgeCategory {
  id: number;
  name: string;
  code: string;
  description: string | null;
  created_at: Date;
}

export interface KnowledgeArticle {
  id: number;
  title: string;
  group_id: number | null;
  subtype_id: number | null;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'archived' | 'published' | 'review' | 'deprecated';
  symptoms: string | null;
  root_cause: string | null;
  diagnostic_data: string | null;
  immediate_fix: string | null;
  permanent_fix: string | null;
  prevention: string | null;
  verification: string | null;
  temenos_contact: string | null;
  notes: string | null;
  author_id?: number | null;
  reviewer_id?: number | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  group?: Group;
  subtype?: Subtype;
  related_tickets?: Ticket[];
  references?: Reference[];
  contacts?: Contact[];
  versions?: KnowledgeVersion[];
}

export interface KnowledgeVersion {
  id: number;
  article_id: number;
  version_number: number;
  title: string;
  content_snapshot: Record<string, any>;
  modified_by: number | null;
  change_summary: string | null;
  created_at: Date;
  modifier_name?: string;
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
  created_at?: Date;
}

export interface Contact {
  id: number;
  article_id: number | null;
  name: string | null;
  email: string | null;
  teams: string | null;
  phone: string | null;
  notes: string | null;
  created_at?: Date;
}

export type UserRole = 'admin' | 'team_lead' | 'knowledge_manager' | 'contributor' | 'viewer';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  phone?: string | null;
  department?: string | null;
  team_id?: number | null;
  team_name?: string | null;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface Team {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  lead_user_id?: number | null;
  lead_name?: string | null;
  created_at: Date;
  updated_at: Date;
  member_count?: number;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: string | null;
  created_at: Date;
  user_name?: string;
  user_email?: string;
}

// ============================================================
// Projects & Tasks Types
// ============================================================

export type ProjectStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'under_review' | 'completed' | 'cancelled';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Project {
  id: number;
  code: string;
  name: string;
  description: string | null;
  business_objective: string | null;
  sponsor: string | null;
  manager_id: number;
  manager_name?: string;
  start_date: string;
  planned_end_date: string;
  actual_end_date: string | null;
  priority: PriorityLevel;
  status: ProjectStatus;
  progress_percentage: number;
  created_at: Date;
  updated_at: Date;
  members?: ProjectMember[];
  milestones?: ProjectMilestone[];
  tasks_count?: number;
  completed_tasks_count?: number;
}

export interface ProjectMember {
  project_id: number;
  user_id: number;
  role_in_project: string;
  created_at: Date;
  user_name?: string;
  user_email?: string;
}

export interface ProjectMilestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  due_date: string;
  completed_date: string | null;
  weight: number;
  status: string;
  created_at: Date;
}

export interface Task {
  id: number;
  task_code: string | null;
  title: string;
  description: string | null;
  project_id: number | null;
  project_name?: string;
  assigned_by: number;
  assigned_by_name?: string;
  assigned_to: number | null;
  assigned_to_name?: string;
  start_date: string | null;
  due_date: string | null;
  priority: PriorityLevel;
  status: TaskStatus;
  progress_percentage: number;
  related_ticket_id: number | null;
  related_ticket_ref?: string;
  completion_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskDependency {
  task_id: number;
  depends_on_task_id: number;
  depends_on_title?: string;
  depends_on_status?: TaskStatus;
}

// ============================================================
// Daily Reports & Activities Types
// ============================================================

export type DailyReportStatus = 'draft' | 'submitted' | 'under_review' | 'returned' | 'approved';

export interface DailyReport {
  id: number;
  user_id: number;
  user_name?: string;
  report_date: string;
  status: DailyReportStatus;
  reviewer_id: number | null;
  reviewer_name?: string;
  reviewer_comments: string | null;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  activities?: DailyActivity[];
  total_hours?: number;
}

export interface DailyActivity {
  id: number;
  report_id: number;
  project_id: number | null;
  project_name?: string;
  task_id: number | null;
  task_title?: string;
  ticket_id: number | null;
  ticket_reference?: string;
  title: string;
  work_performed: string;
  result_outcome: string;
  status: string;
  challenges: string | null;
  next_action: string | null;
  hours_spent: number | null;
  created_at: Date;
}

// ============================================================
// Escalation Types
// ============================================================

export type EscalationStatus = 'open' | 'acknowledged' | 'under_review' | 'action_required' | 'waiting_for_response' | 'resolved' | 'closed';

export interface Escalation {
  id: number;
  escalation_code: string | null;
  title: string;
  description: string;
  escalation_type: 'incident' | 'task' | 'project' | 'blocker' | string;
  source_incident_id: number | null;
  source_incident_ref?: string;
  source_task_id: number | null;
  source_task_title?: string;
  source_project_id: number | null;
  source_project_name?: string;
  raised_by: number;
  raised_by_name?: string;
  current_owner_id: number | null;
  current_owner_name?: string;
  escalated_to_id: number;
  escalated_to_name?: string;
  escalation_level: number;
  reason: string;
  business_impact: string;
  required_response_date: string | null;
  decision_action: string | null;
  resolution_notes: string | null;
  status: EscalationStatus;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  actions?: EscalationAction[];
}

export interface EscalationAction {
  id: number;
  escalation_id: number;
  user_id: number;
  user_name?: string;
  action_type: string;
  action_note: string;
  created_at: Date;
}

// ============================================================
// Search Types
// ============================================================

export interface SearchResult {
  type: 'knowledge' | 'ticket' | 'task' | 'project';
  id: number;
  title: string;
  summary?: string;
  group_code?: string;
  group_name?: string;
  subtype_code?: string;
  subgroup_name?: string;
  severity?: string;
  priority?: string;
  score: number;
  knowledge_completeness?: 'full' | 'partial' | 'none';
  knowledge_category?: 'KNOWLEDGE_AVAILABLE' | 'PARTIAL_KNOWLEDGE' | 'PROBLEM_ONLY' | 'NO_DETAILS';
  has_problem?: boolean;
  has_root_cause?: boolean;
  has_solution?: boolean;
  has_verification?: boolean;
  has_notes?: boolean;
  solution_preview?: string | null;
  match_reason?:
    | 'EXACT_REFERENCE'
    | 'EXACT_TITLE'
    | 'TITLE_MATCH'
    | 'PROBLEM_MATCH'
    | 'ROOT_CAUSE_MATCH'
    | 'SOLUTION_MATCH'
    | 'VERIFICATION_MATCH'
    | 'NOTES_MATCH'
    | 'GROUP_MATCH'
    | 'SUBGROUP_MATCH'
    | 'RELATED_KNOWLEDGE';
  match_reason_label?: string;
  snippet?: {
    field?: string;
    text?: string;
  };
  created_at_ticket?: string | null;
  problem_symptoms?: string | null;
  root_cause?: string | null;
  immediate_fix?: string | null;
  permanent_fix?: string | null;
  verification?: string | null;
  notes?: string | null;
  highlights?: Record<string, string>;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

// ============================================================
// Stats & Dashboard Types
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
  // Hub additions
  total_projects?: number;
  active_projects?: number;
  total_tasks?: number;
  open_tasks?: number;
  overdue_tasks?: number;
  open_escalations?: number;
  daily_report_submissions_today?: number;
}

export interface SearchFilters {
  group?: string;
  priority?: string;
  severity?: string;
  status?: string;
  root_cause?: string;
  sort?: 'relevance' | 'newest' | 'oldest' | 'priority' | 'severity';
}
