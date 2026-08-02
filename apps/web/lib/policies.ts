export type PolicyRuleType = "block" | "warn" | "alert";
export type PolicySeverity = "critical" | "high" | "medium" | "low";

export interface Policy {
  id: string | number;
  name: string;
  rule_type: PolicyRuleType;
  severity?: PolicySeverity;
  description?: string;
  conditions?: Record<string, string>;
  enabled: boolean;
  match_count?: number;
}
