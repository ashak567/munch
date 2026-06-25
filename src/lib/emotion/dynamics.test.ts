import { describe, it, expect } from 'vitest';
import { EmotionDynamicsEngine } from './dynamics';
import { CognitiveTrace, ContextPackage } from '../reflection/types';

describe('Emotion Dynamics Engine', () => {
  const engine = new EmotionDynamicsEngine();

  const getBaseTrace = (): CognitiveTrace => ({
    state: 'Listening',
    emotions: [],
    reflections: [],
    readinessScore: 0,
    readinessThreshold: 0,
    mascotCharacter: 'munch',
    mascotExpression: 'idle',
    mascotReason: '',
    generatedPaths: [],
    confidence: 1.0,
    activeTopicKey: 'general'
  });

  const getBaseContext = (input: string): ContextPackage => ({
    user_id: 'user_123',
    user_input: input,
    user_name: 'Friend',
    user_nickname: 'Friend',
    options: [],
    profile_beliefs: [],
    relevant_memories: [],
    decision_history: []
  });

  it('should detect "improving" momentum and "emotionalRecovery" when moving from overwhelmed to happy', async () => {
    const trace = getBaseTrace();
    // Current turn: user is happy
    trace.emotionalState = {
      primaryEmotion: 'happy',
      confidence: 0.8,
      intensity: 0.6,
      stability: 1.0,
      emotionalConsistency: 'stable',
      needsEmotionalValidation: false,
      evidence: []
    };

    const context = getBaseContext('I am feeling good now.');
    context.chatHistory = [
      {
        sender: 'user',
        content: 'I am so stressed and overwhelmed!' // distress intensity ~0.9
      },
      {
        sender: 'user',
        content: 'I am feeling good now.' // current message in history
      }
    ];

    const result = await engine.execute(trace, context);

    expect(result.emotionDynamics).toBeDefined();
    expect(result.emotionDynamics?.emotionalMomentum).toBe('improving');
    expect(result.emotionDynamics?.emotionalRecovery).toBe(true);
    expect(result.emotionDynamics?.transitions).toBe(1);
    expect(result.emotionDynamics?.volatility).toBe(1.0);
  });

  it('should detect "declining" momentum when shifting from happy to anxious', async () => {
    const trace = getBaseTrace();
    // Current turn: user is anxious
    trace.emotionalState = {
      primaryEmotion: 'anxious',
      confidence: 0.9,
      intensity: 0.8,
      stability: 1.0,
      emotionalConsistency: 'stable',
      needsEmotionalValidation: true,
      evidence: []
    };

    const context = getBaseContext('I feel so anxious.');
    context.chatHistory = [
      {
        sender: 'user',
        content: 'I am happy!' // positive wellness ~0.7
      },
      {
        sender: 'user',
        content: 'I feel so anxious.' // current
      }
    ];

    const result = await engine.execute(trace, context);

    expect(result.emotionDynamics?.emotionalMomentum).toBe('declining');
    expect(result.emotionDynamics?.emotionalRecovery).toBe(false);
    expect(result.emotionDynamics?.transitions).toBe(1);
  });

  it('should detect "stable" momentum and low volatility when tone remains unchanged', async () => {
    const trace = getBaseTrace();
    trace.emotionalState = {
      primaryEmotion: 'tired',
      confidence: 0.8,
      intensity: 0.6,
      stability: 1.0,
      emotionalConsistency: 'stable',
      needsEmotionalValidation: false,
      evidence: []
    };

    const context = getBaseContext('I am tired.');
    context.chatHistory = [
      {
        sender: 'user',
        content: 'I am tired.'
      },
      {
        sender: 'user',
        content: 'I am tired.'
      }
    ];

    const result = await engine.execute(trace, context);

    expect(result.emotionDynamics?.emotionalMomentum).toBe('stable');
    expect(result.emotionDynamics?.volatility).toBe(0.0);
    expect(result.emotionDynamics?.transitions).toBe(0);
  });
});
