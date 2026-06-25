import { MascotCharacter, MascotExpression } from '@/components/Mascot';
import { DetectedEmotion, EmotionalState, EmotionalGuidance, EmotionalDynamics } from '../emotion/types';

export type ConversationState =
  | 'Listening'
  | 'Understanding'
  | 'Exploring'
  | 'Clarifying'
  | 'Emerging Paths'
  | 'Choosing'
  | 'Reflection'
  | 'Learning'
  | 'Archived';

export interface PathCandidate {
  text: string;
  tags: string[];
}

export interface StructuredReflection {
  observation: string;
  reflection: string;
  confidence: number;
  type: 'energy' | 'emotion' | 'conflict' | 'path' | 'general';
}

export interface CognitiveTrace {
  state: ConversationState;
  emotions: string[];
  detectedEmotion?: DetectedEmotion;
  emotionalState?: EmotionalState;
  emotionalGuidance?: EmotionalGuidance;
  emotionDynamics?: EmotionalDynamics;
  reflections: StructuredReflection[];
  readinessScore: number;
  readinessThreshold: number;
  mascotCharacter: MascotCharacter;
  mascotExpression: MascotExpression;
  mascotReason: string;
  generatedPaths: PathCandidate[];
  confidence: number;
  activeTopicKey: string;
}

export interface ContextPackage {
  user_id: string;
  user_input: string;
  user_name?: string;
  user_nickname?: string;
  options: string[]; // legacy compatibility
  importance?: string;
  emotional_state?: string;
  current_context?: string;
  profile_beliefs: any[];
  relevant_memories: any[];
  decision_history: any[];
  recent_context?: {
    active_topics: string[];
    intent_hints: string[];
    summary_of_recent_interactions: string;
  };
  uncertainties?: any[];
  chatHistory?: any[];
  [key: string]: any;
}

export interface CognitiveEngine {
  name: string;
  execute(trace: CognitiveTrace, context: ContextPackage): Promise<CognitiveTrace>;
}
