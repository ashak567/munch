export type HUPSDimension =
  | 'identity'
  | 'relationship'
  | 'values'
  | 'communication'
  | 'decision_pattern'
  | 'comfort'
  | 'interests'
  | 'emotional_pattern'
  | 'narrative'
  | 'growth'
  | 'memory_reference'
  | 'uncertainty';

export interface HUPSObservation {
  id?: string;
  user_id: string;
  source_type: 'decision' | 'feedback' | 'conversation' | 'interaction';
  source_id: string;
  dimension: HUPSDimension;
  key: string;
  observed_value: any;
  confidence: number;
  context?: string;
  created_at?: string;
}

export interface HUPSBelief {
  id: string;
  user_id: string;
  dimension: HUPSDimension;
  key: string;
  value: any;
  confidence: number;
  evidence_count: number;
  evidence_refs: Array<{
    observation_id: string;
    source_type: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface HumanProfile {
  identity: Record<string, any>;
  relationship: Record<string, any>;
  values: Record<string, { confidence: number; evidenceCount: number }>;
  communication: Record<string, number>; // probability
  decisionPattern: Record<string, number>; // probability
  comfort: Record<string, number>; // preference score
  interests: Record<string, { recency: string; relevance: number }>;
  emotionalPattern: Array<{ pattern: string; context?: string }>;
  narrative: Array<string>;
  growth: Array<{ area: string; observationDate: string }>;
  uncertainty: Array<string>;
}
