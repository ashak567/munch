import { HUPSBelief } from '../hup/types';
import { UserMemory } from '../memory/types';

export interface ContextPackage {
  user_id: string;
  user_input: string;
  user_name?: string;
  user_nickname?: string;
  options: string[];
  importance?: string;
  emotional_state?: string;
  current_context?: string;
  profile_beliefs: HUPSBelief[];
  relevant_memories: UserMemory[];
  recent_conversations?: any[];
  decision_history?: any[];
  active_observations?: any[];
}

export type ObservationType =
  | 'nlu'
  | 'emotion'
  | 'intent'
  | 'relationship_signal'
  | 'mascot_recommendation'
  | 'reasoning_hypothesis';

export interface AgentObservation {
  agent_name: string;
  type: ObservationType;
  key: string;
  value: any;
  confidence: number;
  reasoning: string;
}

export interface ConflictRecord {
  key: string;
  competing_observations: AgentObservation[];
  uncertainty_level: number;
}

export interface ReasoningPackage {
  context: ContextPackage;
  observations: AgentObservation[];
  conflicts: ConflictRecord[];
  uncertainties: string[];
}

export interface Agent {
  name: string;
  analyze(context: ContextPackage): Promise<AgentObservation[]>;
}
