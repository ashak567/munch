import { CognitiveEngine, CognitiveTrace, ContextPackage } from '../reflection/types';
import { MunchEmotion, EmotionalDynamics } from './types';

// Simplified keyword maps to reconstruct emotions from past user messages
const KEYWORDS_MAP: Record<MunchEmotion, string[]> = {
  happy: ['happy', 'glad', 'good', 'great', 'content', 'calm', 'fine', 'perfect', 'cheerful', 'joyful', 'awesome', 'wonderful'],
  sad: ['sad', 'unhappy', 'cry', 'down', 'disappointed', 'awful', 'bad', 'depressed', 'gloomy', 'miserable'],
  overwhelmed: ['overwhelmed', 'stressed', 'hectic', 'too much', 'drowning', 'buried', 'flooded', 'insane', 'chaos', 'overload', 'stress'],
  anxious: ['anxious', 'worry', 'fear', 'panic', 'freaking', 'scared', 'nervous', 'afraid', 'unsure', 'hesitant'],
  tired: ['tired', 'sleepy', 'exhausted', 'fatigued', 'drained', 'weary', 'spent', 'no energy', 'fatigue'],
  excited: ['excited', 'thrilled', 'hype', 'stoked', 'pumped', 'cant wait', "can't wait", 'amazing', 'great'],
  uncertain: []
};

const INTENSIFIERS = ['really', 'very', 'so', 'extremely', 'super', 'absolutely', 'completely', 'totally', 'quite', 'highly'];

function reconstructUserEmotion(text: string): { emotion: MunchEmotion; intensity: number } {
  const inputLower = text.toLowerCase();
  
  let matchedEmotion: MunchEmotion = 'uncertain';
  let hasKeyword = false;

  for (const [emotion, keywords] of Object.entries(KEYWORDS_MAP)) {
    for (const kw of keywords) {
      const reg = new RegExp(`\\b${kw}\\b`, 'i');
      if (reg.test(inputLower)) {
        matchedEmotion = emotion as MunchEmotion;
        hasKeyword = true;
        break;
      }
    }
    if (hasKeyword) break;
  }

  if (matchedEmotion === 'uncertain') {
    return { emotion: 'uncertain', intensity: 0.3 };
  }

  let intensity = 0.6;
  const matchedIntensifiers = INTENSIFIERS.filter(inf => {
    const reg = new RegExp(`\\b${inf}\\b`, 'i');
    return reg.test(inputLower);
  });
  if (matchedIntensifiers.length > 0) {
    intensity += 0.2;
  }
  if (text.includes('!')) {
    intensity += 0.1;
  }
  
  intensity = Math.min(1.0, intensity);
  return { emotion: matchedEmotion, intensity };
}

export class EmotionDynamicsEngine implements CognitiveEngine {
  public name = 'Emotion Dynamics Engine';

  public async execute(trace: CognitiveTrace, context: ContextPackage): Promise<CognitiveTrace> {
    const userSequence: Array<{ emotion: MunchEmotion; intensity: number }> = [];

    // 1. Reconstruct emotions from past user messages in the current conversation
    if (context.chatHistory && Array.isArray(context.chatHistory)) {
      const userMessages = context.chatHistory.filter((m: any) => m.sender === 'user');
      
      const hasCurrentInHistory = userMessages.length > 0 && 
        userMessages[userMessages.length - 1].content.trim() === (context.user_input || '').trim();

      const prevUserMessages = hasCurrentInHistory ? userMessages.slice(0, -1) : userMessages;
      for (const msg of prevUserMessages) {
        const reconstructed = reconstructUserEmotion(msg.content);
        userSequence.push(reconstructed);
      }
    }

    // 2. Append the current user turn's state
    const currentEmotion = trace.emotionalState ? trace.emotionalState.primaryEmotion : 'uncertain';
    const currentIntensity = trace.emotionalState ? trace.emotionalState.intensity : 0.3;
    userSequence.push({ emotion: currentEmotion, intensity: currentIntensity });

    // 3. Compute Transitions and Volatility
    let transitions = 0;
    for (let i = 1; i < userSequence.length; i++) {
      if (userSequence[i].emotion !== userSequence[i - 1].emotion) {
        transitions++;
      }
    }

    const volatility = userSequence.length > 1 ? Number((transitions / (userSequence.length - 1)).toFixed(2)) : 0.0;

    // 4. Map Wellness/Valence scores
    const wellnessSequence = userSequence.map(item => {
      const isPositive = ['happy', 'excited'].includes(item.emotion);
      const isNegative = ['sad', 'overwhelmed', 'anxious', 'tired'].includes(item.emotion);
      
      if (isPositive) return item.intensity;
      if (isNegative) return -item.intensity;
      return 0.0;
    });

    // 5. Calculate Emotional Momentum
    let momentum: 'improving' | 'stable' | 'declining' = 'stable';
    const startWellness = wellnessSequence[0];
    const endWellness = wellnessSequence[wellnessSequence.length - 1];

    if (wellnessSequence.length > 1) {
      const diff = endWellness - startWellness;
      if (diff >= 0.15) {
        momentum = 'improving';
      } else if (diff <= -0.15) {
        momentum = 'declining';
      } else {
        momentum = 'stable';
      }
    }

    // 6. Calculate Emotional Recovery
    let emotionalRecovery = false;
    let maxDistressInHistory = 0.0;

    // A distressed state is overwhelmed, anxious, or sad with high intensity
    const distressSequence = userSequence.map(item => {
      const isDistressedEmotion = ['overwhelmed', 'anxious', 'sad'].includes(item.emotion);
      return isDistressedEmotion ? item.intensity : 0.0;
    });

    // We check the history (excluding the current turn) for high distress
    const prevDistressSequence = distressSequence.slice(0, -1);
    if (prevDistressSequence.length > 0) {
      maxDistressInHistory = Math.max(...prevDistressSequence);
    }

    const currentDistress = distressSequence[distressSequence.length - 1];

    if (maxDistressInHistory >= 0.60 && (maxDistressInHistory - currentDistress) >= 0.30 && currentDistress < 0.60) {
      emotionalRecovery = true;
    }

    // Assemble the dynamics result
    const dynamics: EmotionalDynamics = {
      emotionalMomentum: momentum,
      volatility,
      transitions,
      emotionalRecovery,
      evidence: [
        `momentum: ${momentum}`,
        `transitions: ${transitions}`,
        `volatility: ${volatility.toFixed(2)}`,
        `recovery: ${emotionalRecovery}`
      ]
    };

    return {
      ...trace,
      emotionDynamics: dynamics
    };
  }
}
