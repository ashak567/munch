import { CognitiveEngine, CognitiveTrace, ContextPackage } from '../reflection/types';
import { MunchEmotion, DetectedEmotion, EmotionProfile } from './types';
import { getFallbackObservationsForAgent } from '../orchestrator/agents';

// Define the core profiles that can easily be extended
const EMOTION_PROFILES: EmotionProfile[] = [
  {
    emotion: 'happy',
    nluSignals: ['calm', 'high_engagement', 'joyful'],
    keywords: ['happy', 'glad', 'good', 'great', 'content', 'calm', 'fine', 'perfect', 'cheerful', 'joyful', 'awesome', 'wonderful'],
    contextKeys: ['happy', 'joyful', 'content']
  },
  {
    emotion: 'sad',
    nluSignals: ['expressing_frustration', 'venting', 'seeking_comfort', 'sad'],
    keywords: ['sad', 'unhappy', 'cry', 'down', 'disappointed', 'awful', 'bad', 'depressed', 'gloomy', 'miserable'],
    contextKeys: ['sad', 'unhappy', 'depressed']
  },
  {
    emotion: 'overwhelmed',
    nluSignals: ['mental_overload', 'cognitive_fatigue', 'needs_grounding', 'overwhelmed'],
    keywords: ['overwhelmed', 'stressed', 'hectic', 'too much', 'drowning', 'buried', 'flooded', 'insane', 'chaos', 'overload', 'stress'],
    contextKeys: ['overwhelmed', 'stressed']
  },
  {
    emotion: 'anxious',
    nluSignals: ['uncertainty', 'hesitant', 'undecided', 'anxious'],
    keywords: ['anxious', 'worry', 'fear', 'panic', 'freaking', 'scared', 'nervous', 'afraid', 'unsure', 'hesitant'],
    contextKeys: ['anxious', 'worried', 'fearful']
  },
  {
    emotion: 'tired',
    nluSignals: ['low_energy', 'cognitive_fatigue', 'tired'],
    keywords: ['tired', 'sleepy', 'exhausted', 'fatigued', 'drained', 'weary', 'spent', 'no energy', 'fatigue'],
    contextKeys: ['tired', 'exhausted', 'fatigued']
  },
  {
    emotion: 'excited',
    nluSignals: ['high_engagement', 'joyful', 'excited'],
    keywords: ['excited', 'thrilled', 'hype', 'stoked', 'pumped', 'cant wait', "can't wait", 'amazing', 'great'],
    contextKeys: ['excited', 'thrilled']
  }
];

export class EmotionEngine implements CognitiveEngine {
  public name = 'Emotion Engine';

  public async execute(trace: CognitiveTrace, context: ContextPackage): Promise<CognitiveTrace> {
    const userInput = context.user_input || '';
    const observations = context.observations || [];
    const profileBeliefs = context.profile_beliefs || [];
    const emotionalState = context.emotional_state || '';
    const recentSummary = context.recent_context?.summary_of_recent_interactions || '';

    // Retrieve fallback observations for Emotion Agent if not already in context
    const fallbackObs = getFallbackObservationsForAgent('Emotion Agent', context as any);
    const allObservations = [...observations, ...fallbackObs];

    const candidateScores: Array<{
      emotion: MunchEmotion;
      score: number;
      evidence: string[];
      nluScore: number;
      lingScore: number;
      ctxScore: number;
    }> = [];

    // Extract intensifiers from current user input for Linguistic features and Intensity
    const intensifiers = ['really', 'very', 'so', 'extremely', 'super', 'absolutely', 'completely', 'totally', 'quite', 'highly'];
    const inputLower = userInput.toLowerCase();
    const hasExclamation = userInput.includes('!');
    const matchedIntensifiers = intensifiers.filter(inf => {
      const reg = new RegExp(`\\b${inf}\\b`, 'i');
      return reg.test(inputLower);
    });
    
    // Check for ALL CAPS words (length > 2)
    const words = userInput.split(/\s+/);
    const hasAllCaps = words.some(w => {
      const cleanWord = w.replace(/[^A-Za-z]/g, '');
      return cleanWord.length > 2 && cleanWord === cleanWord.toUpperCase();
    });

    for (const profile of EMOTION_PROFILES) {
      const localEvidence: string[] = [];
      
      // 1. NLU/Agent Signals (60% weight)
      let maxNluConf = 0;
      let matchedNluSignal = '';
      
      for (const obs of allObservations) {
        // NLU Agent observations
        if (obs.agent_name === 'NLU Agent' && obs.value && Array.isArray(obs.value)) {
          for (const val of obs.value) {
            const signalVal = val.signal || val.readiness_state || val.certainty_level || val.purpose || '';
            if (profile.nluSignals.includes(signalVal)) {
              const conf = val.confidence || obs.confidence || 0.8;
              if (conf > maxNluConf) {
                maxNluConf = conf;
                matchedNluSignal = signalVal;
              }
            }
          }
        }
        // Emotion Agent observations (either Gemini or fallback)
        if (obs.agent_name === 'Emotion Agent' && obs.key === 'emotional_state' && obs.value) {
          const emotionVal = String(obs.value).toLowerCase();
          
          // Ignore default fallback 'calm' observation if no keywords matched
          const isDefaultFallbackCalm = emotionVal === 'calm' && obs.reasoning === 'Fallback emotional keyword extraction.';
          
          if (!isDefaultFallbackCalm) {
            const isMatch = profile.nluSignals.includes(emotionVal) || 
              (emotionVal === 'joyful' && (profile.emotion === 'happy' || profile.emotion === 'excited'));
            
            if (isMatch) {
              const conf = obs.confidence || 0.75;
              if (conf > maxNluConf) {
                maxNluConf = conf;
                matchedNluSignal = emotionVal;
              }
            }
          }
        }
      }
      
      if (maxNluConf > 0) {
        localEvidence.push(`NLU signal: ${matchedNluSignal} (confidence: ${maxNluConf.toFixed(2)})`);
      }

      // 2. Linguistic Features (25% weight)
      let lingScore = 0;
      let matchedKeyword = '';
      
      for (const kw of profile.keywords) {
        const reg = new RegExp(`\\b${kw}\\b`, 'i');
        if (reg.test(inputLower)) {
          lingScore = 0.8;
          matchedKeyword = kw;
          break;
        }
      }
      
      if (lingScore > 0) {
        localEvidence.push(`keyword: ${matchedKeyword}`);
        
        // Boost linguistic score if intensifiers are present
        if (matchedIntensifiers.length > 0 || hasExclamation || hasAllCaps) {
          lingScore = 1.0;
          if (matchedIntensifiers.length > 0) {
            localEvidence.push(`intensifier: ${matchedIntensifiers.join(', ')}`);
          }
          if (hasExclamation) {
            localEvidence.push('linguistic cue: exclamation mark');
          }
          if (hasAllCaps) {
            localEvidence.push('linguistic cue: ALL CAPS text');
          }
        }
      }

      // 3. Context Evidence (15% weight)
      let maxCtxScore = 0;
      let ctxSource = '';

      // Check current input explicit emotional_state override
      if (emotionalState && profile.contextKeys.some(ck => emotionalState.toLowerCase().includes(ck))) {
        maxCtxScore = 1.0;
        ctxSource = `context emotional state: "${emotionalState}"`;
      }

      // Check profile beliefs (HUPS)
      if (profileBeliefs && profileBeliefs.length > 0) {
        for (const belief of profileBeliefs) {
          const beliefDesc = (belief.belief_value || belief.description || '').toLowerCase();
          const beliefDim = (belief.dimension || '').toLowerCase();
          const isBeliefMatch = profile.contextKeys.some(ck => beliefDesc.includes(ck) || beliefDim.includes(ck));
          if (isBeliefMatch) {
            const conf = belief.confidence || 0.7;
            if (conf > maxCtxScore) {
              maxCtxScore = conf;
              ctxSource = `profile belief: "${belief.belief_value || belief.dimension}" (confidence: ${conf.toFixed(2)})`;
            }
          }
        }
      }

      // Check recent summary
      if (recentSummary && profile.contextKeys.some(ck => recentSummary.toLowerCase().includes(ck))) {
        if (0.5 > maxCtxScore) {
          maxCtxScore = 0.5;
          ctxSource = 'recent interactions summary';
        }
      }

      if (maxCtxScore > 0) {
        localEvidence.push(`${ctxSource}`);
      }

      // Calculate Total Score
      const totalScore = (0.60 * maxNluConf) + (0.25 * lingScore) + (0.15 * maxCtxScore);

      candidateScores.push({
        emotion: profile.emotion,
        score: totalScore,
        evidence: localEvidence,
        nluScore: maxNluConf,
        lingScore: lingScore,
        ctxScore: maxCtxScore
      });
    }

    // Sort candidate scores descending
    candidateScores.sort((a, b) => b.score - a.score);

    const THRESHOLD = 0.35;
    let detected: DetectedEmotion;

    if (candidateScores.length > 0 && candidateScores[0].score >= THRESHOLD) {
      const primary = candidateScores[0];
      const secondaryCandidate = candidateScores.find((c, idx) => idx > 0 && c.score >= THRESHOLD && c.emotion !== primary.emotion);
      
      // Calculate intensity based on primary score + intensifiers
      let intensity = primary.score;
      if (matchedIntensifiers.length > 0) {
        intensity += Math.min(0.25, matchedIntensifiers.length * 0.10);
      }
      if (hasExclamation) {
        intensity += 0.15;
      }
      if (hasAllCaps) {
        intensity += 0.15;
      }
      intensity = Math.min(1.0, Math.max(0.0, intensity));

      // Combine primary evidence and any specific markers
      const finalEvidence = [...primary.evidence];
      if (matchedIntensifiers.length > 0 && !finalEvidence.some(e => e.includes('intensifier'))) {
        finalEvidence.push(`intensifier: ${matchedIntensifiers.join(', ')}`);
      }

      detected = {
        primaryEmotion: primary.emotion,
        secondaryEmotion: secondaryCandidate ? secondaryCandidate.emotion : undefined,
        confidence: Math.min(1.0, primary.score),
        intensity: intensity,
        evidence: finalEvidence
      };
    } else {
      // Fallback to uncertain
      detected = {
        primaryEmotion: 'uncertain',
        confidence: 0.5,
        intensity: 0.3,
        evidence: ['No core emotion score exceeded the threshold of 0.35']
      };
    }

    // Map detected emotion back to the legacy emotions array for compatibility with Mascot/Reflection engines
    const emotionsList: string[] = [detected.primaryEmotion];
    if (detected.secondaryEmotion) {
      emotionsList.push(detected.secondaryEmotion);
    }

    return {
      ...trace,
      detectedEmotion: detected,
      emotions: emotionsList
    };
  }
}
