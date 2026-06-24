import { HUPSBelief } from '../hup/types';
import { UserMemory } from '../memory/types';

export interface TopicAnalysis {
  active_topics: string[];
  intent_hints: string[];
}

export interface UncertaintySignal {
  key: string;
  confidence: number;
  description: string;
}

export interface ContextPackage {
  user_id: string;
  user_input: string;
  user_name?: string;
  user_nickname?: string;
  options: string[];
  importance?: string;
  emotional_state?: string;
  current_context?: string;

  // Layer 3 compatibility
  profile_beliefs: HUPSBelief[];
  relevant_memories: UserMemory[];
  decision_history?: any[];

  // Layer 4 Refined attention signals
  profile_signals: HUPSBelief[];
  relationship_signals: HUPSBelief[];
  relevant_decisions: any[];
  recent_context: {
    active_topics: string[];
    intent_hints: string[];
    summary_of_recent_interactions?: string;
  };
  uncertainties: UncertaintySignal[];
}
