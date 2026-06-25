import { CognitiveEngine, CognitiveTrace, ContextPackage } from '../reflection/types';
import { EmotionalGuidance } from './types';

export class EmotionRegulationEngine implements CognitiveEngine {
  public name = 'Emotion Regulation Engine';

  public async execute(trace: CognitiveTrace, context: ContextPackage): Promise<CognitiveTrace> {
    const state = trace.emotionalState || {
      primaryEmotion: 'uncertain',
      confidence: 0.5,
      intensity: 0.3,
      stability: 1.0,
      emotionalConsistency: 'stable',
      needsEmotionalValidation: false,
      evidence: []
    };

    const primary = state.primaryEmotion;
    const confidence = state.confidence;
    const intensity = state.intensity;

    let responseStyle: EmotionalGuidance['responseStyle'] = 'reflect';
    let urgency: EmotionalGuidance['urgency'] = 'low';
    let pacing: EmotionalGuidance['pacing'] = 'normal';
    let shouldAskQuestion = false;
    let shouldSuggestBreak = false;
    let allowDecision = true;
    const regEvidence: string[] = [];

    // 1. Determine Response Style
    if (primary === 'overwhelmed') {
      if (intensity >= 0.70) {
        responseStyle = 'comfort';
        regEvidence.push('style: comfort (overwhelmed with intensity >= 0.70)');
      } else {
        responseStyle = 'reflect';
        regEvidence.push('style: reflect (overwhelmed with intensity < 0.70)');
      }
    } else if (primary === 'anxious') {
      if (intensity >= 0.60) {
        responseStyle = 'ground';
        regEvidence.push('style: ground (anxious with intensity >= 0.60)');
      } else {
        responseStyle = 'comfort';
        regEvidence.push('style: comfort (anxious with intensity < 0.60)');
      }
    } else if (primary === 'tired') {
      responseStyle = 'encourage';
      regEvidence.push('style: encourage (tired state detected)');
    } else if (primary === 'happy' || primary === 'excited') {
      responseStyle = 'celebrate';
      regEvidence.push(`style: celebrate (${primary} state detected)`);
    } else if (primary === 'sad') {
      responseStyle = 'comfort';
      regEvidence.push('style: comfort (sad state detected)');
    } else if (primary === 'uncertain') {
      responseStyle = 'clarify';
      regEvidence.push('style: clarify (uncertain state detected)');
    } else {
      responseStyle = 'reflect';
      regEvidence.push('style: reflect (default fallback)');
    }

    // 2. Calculate Urgency
    if (confidence >= 0.80 && intensity >= 0.80) {
      urgency = 'high';
      regEvidence.push('urgency: high (confidence >= 0.80 and intensity >= 0.80)');
    } else if (confidence >= 0.50 && intensity >= 0.50) {
      urgency = 'medium';
      regEvidence.push('urgency: medium (confidence and intensity >= 0.50)');
    } else {
      urgency = 'low';
      regEvidence.push('urgency: low (default baseline)');
    }

    // 3. Select Pacing
    if (['anxious', 'overwhelmed', 'sad'].includes(primary) && intensity >= 0.50) {
      pacing = 'slow';
      regEvidence.push(`pacing: slow (high intensity ${primary})`);
    } else if (primary === 'excited' && intensity >= 0.60) {
      pacing = 'energetic';
      regEvidence.push('pacing: energetic (highly excited state)');
    } else {
      pacing = 'normal';
      regEvidence.push('pacing: normal (default)');
    }

    // 4. Suggest Break & Ask Question
    if (primary === 'uncertain' || confidence < 0.50) {
      shouldAskQuestion = true;
      regEvidence.push('clarification: enabled (uncertain emotion or low confidence)');
    }

    if (primary === 'overwhelmed' && intensity >= 0.70) {
      shouldSuggestBreak = true;
      regEvidence.push('break: suggested (overwhelmed with intensity >= 0.70)');
    }

    // 5. Allow Decision Gating
    if (primary === 'overwhelmed' || primary === 'uncertain' || shouldSuggestBreak) {
      allowDecision = false;
      regEvidence.push(`decision: disallowed (primary emotion is ${primary}${shouldSuggestBreak ? ' with break suggestion' : ''})`);
    } else {
      allowDecision = true;
      regEvidence.push('decision: allowed');
    }

    const guidance: EmotionalGuidance = {
      responseStyle,
      urgency,
      pacing,
      shouldAskQuestion,
      shouldSuggestBreak,
      allowDecision,
      evidence: regEvidence
    };

    return {
      ...trace,
      emotionalGuidance: guidance
    };
  }
}
