export type CoreEmotion =
  | 'happy'
  | 'sad'
  | 'overwhelmed'
  | 'anxious'
  | 'tired'
  | 'excited'
  | 'uncertain';

export type MunchEmotion = CoreEmotion;

export interface DetectedEmotion {
  primaryEmotion: MunchEmotion;
  secondaryEmotion?: MunchEmotion;
  confidence: number; // 0.0 to 1.0
  intensity: number;  // 0.0 to 1.0
  evidence: string[]; // Explanations of matched signals/keywords/beliefs
}

export interface EmotionalState {
  primaryEmotion: MunchEmotion;
  secondaryEmotion?: MunchEmotion;
  confidence: number;
  intensity: number;
  stability: number;
  emotionalConsistency: 'stable' | 'mixed' | 'conflicted';
  needsEmotionalValidation: boolean;
  evidence: string[];
}

export interface EmotionalGuidance {
  responseStyle:
    | 'comfort'
    | 'encourage'
    | 'clarify'
    | 'celebrate'
    | 'ground'
    | 'reflect';
  urgency: 'low' | 'medium' | 'high';
  pacing: 'slow' | 'normal' | 'energetic';
  shouldAskQuestion: boolean;
  shouldSuggestBreak: boolean;
  allowDecision: boolean;
  evidence: string[];
}

export interface EmotionalDynamics {
  emotionalMomentum: 'improving' | 'stable' | 'declining';
  volatility: number;    // 0.0 to 1.0 representing rate of transitions
  transitions: number;   // count of emotion switches
  emotionalRecovery: boolean; // true if recovering from highly distressed state
  evidence: string[];
}

export interface EmotionProfile {
  emotion: MunchEmotion;
  nluSignals: string[];
  keywords: string[];
  contextKeys: string[];
}
