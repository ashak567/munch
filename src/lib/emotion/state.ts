import { CognitiveEngine, CognitiveTrace, ContextPackage } from '../reflection/types';
import { MunchEmotion, DetectedEmotion, EmotionalState } from './types';

export class EmotionalStateEngine implements CognitiveEngine {
  public name = 'Emotional State Engine';

  public async execute(trace: CognitiveTrace, context: ContextPackage): Promise<CognitiveTrace> {
    // 1. Get the detected emotion from the previous stage
    const detected = trace.detectedEmotion || {
      primaryEmotion: 'uncertain',
      confidence: 0.5,
      intensity: 0.3,
      evidence: ['Default detection fallback']
    };

    // 2. Extract emotions from the active conversation history
    const emotionSequence: MunchEmotion[] = [];

    if (context.chatHistory && Array.isArray(context.chatHistory)) {
      for (const msg of context.chatHistory) {
        if (msg.sender === 'mascot' && msg.nlu_metadata) {
          let metadata = msg.nlu_metadata;
          if (typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata);
            } catch {
              metadata = {};
            }
          }
          const pastEmotions = metadata.emotions;
          if (Array.isArray(pastEmotions) && pastEmotions.length > 0) {
            emotionSequence.push(pastEmotions[0] as MunchEmotion);
          }
        }
      }
    }

    // Append current turn's primary emotion
    emotionSequence.push(detected.primaryEmotion);

    // 3. Compute stability, consistency, and validation needs
    const uniqueAll = Array.from(new Set(emotionSequence));
    const activeEmotions = emotionSequence.filter(e => e !== 'uncertain');
    const uniqueActive = Array.from(new Set(activeEmotions));

    let stability = 1.0;
    let consistency: 'stable' | 'mixed' | 'conflicted' = 'stable';
    let needsValidation = false;
    let stabilityEvidence = '';

    if (uniqueAll.length <= 1) {
      stability = 1.0;
      consistency = 'stable';
      stabilityEvidence = 'emotional stability: high consistency';
    } else {
      const hasPositive = emotionSequence.some(e => ['happy', 'excited'].includes(e));
      const hasNegative = emotionSequence.some(e => ['sad', 'overwhelmed', 'anxious', 'tired'].includes(e));
      const hasHappy = emotionSequence.includes('happy');
      const hasSad = emotionSequence.includes('sad');
      const hasOverwhelmed = emotionSequence.includes('overwhelmed');

      if (hasHappy && (hasSad || hasOverwhelmed)) {
        // Direct positive/negative contradictions
        stability = 0.25;
        consistency = 'conflicted';
        needsValidation = true;
        stabilityEvidence = 'emotional stability: low consistency (direct contradiction)';
      } else if (hasPositive && hasNegative) {
        // Mixed transitions (e.g., excited and anxious/uncertain)
        stability = 0.60;
        consistency = 'mixed';
        needsValidation = true;
        stabilityEvidence = 'emotional stability: medium consistency (mixed states)';
      } else if (hasNegative && uniqueActive.length > 1) {
        // Shifts within negative states
        stability = 0.80;
        consistency = 'stable';
        stabilityEvidence = 'emotional stability: high-medium consistency (shifting negative states)';
      } else if (hasPositive && uniqueActive.length > 1) {
        // Shifts within positive states
        stability = 0.85;
        consistency = 'stable';
        stabilityEvidence = 'emotional stability: high consistency (shifting positive states)';
      } else {
        stability = 0.70;
        consistency = 'mixed';
        needsValidation = true;
        stabilityEvidence = 'emotional stability: medium consistency';
      }
    }

    // Dominant negative emotions require validation
    if (['sad', 'overwhelmed', 'anxious'].includes(detected.primaryEmotion)) {
      needsValidation = true;
    }

    // Assemble the full emotional state
    const emotionalState: EmotionalState = {
      primaryEmotion: detected.primaryEmotion,
      secondaryEmotion: detected.secondaryEmotion,
      confidence: detected.confidence,
      intensity: detected.intensity,
      stability: stability,
      emotionalConsistency: consistency,
      needsEmotionalValidation: needsValidation,
      evidence: [...detected.evidence, stabilityEvidence]
    };

    return {
      ...trace,
      emotionalState
    };
  }
}
