export interface DashboardEvent {
  id: string | number;
  severity?: string;
  event_type: string;
  source: string;
  message: string;
  created_at?: string;
  analysis_id?: string | number;
}

export interface RecentAnalysis {
  id: string | number;
  repo_full_name: string;
  pr_number: number;
  head_sha?: string;
  created_at: string;
  policy_verdict?: string;
  risk_score?: number;
}

export interface DashboardOverview {
  repos: number;
  analyses_7d: number;
  avg_risk_7d: number | null;
  open_incidents: number;
  critical_incidents: number;
  memory_entries: number;
  recent_events?: DashboardEvent[];
  recent_analyses?: RecentAnalysis[];
}

export interface DashboardPlan {
  is_premium?: boolean;
  plan?: string;
  repos?: { active: number; limit: number | null };
  monthly_pr_reviews?: { used: number; limit: number };
}

export interface DashboardIncident {
  id: string | number;
  severity: string;
  status: string;
  title: string;
  recurrence_count: number;
  last_seen_at?: string;
}
