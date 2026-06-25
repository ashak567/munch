import { describe, it, expect } from 'vitest';
import { EmotionEngine } from './engine';
import { CognitiveTrace, ContextPackage } from '../reflection/types';

describe('Emotion Detection Engine', () => {
  const engine = new EmotionEngine();

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

  it('should detect "tired" based on NLU observations and user input keywords', async () => {
    const context = getBaseContext('I am feeling so tired today.');
    context.observations = [
      {
        agent_name: 'NLU Agent',
        type: 'nlu',
        key: 'state_signals',
        value: [{ signal: 'low_energy', confidence: 0.9 }],
        confidence: 0.9,
        reasoning: 'Resolved low energy'
      }
    ];

    const result = await engine.execute(getBaseTrace(), context);

    expect(result.detectedEmotion).toBeDefined();
    expect(result.detectedEmotion?.primaryEmotion).toBe('tired');
    expect(result.detectedEmotion?.confidence).toBeGreaterThan(0.7);
    expect(result.detectedEmotion?.intensity).toBeGreaterThan(0.7);
    expect(result.detectedEmotion?.evidence).toContain('NLU signal: low_energy (confidence: 0.90)');
    expect(result.detectedEmotion?.evidence).toContain('keyword: tired');
    expect(result.detectedEmotion?.evidence).toContain('intensifier: so');
    expect(result.emotions).toContain('tired');
  });

  it('should detect "overwhelmed" under mental overload', async () => {
    const context = getBaseContext('There is just too much to do!');
    context.observations = [
      {
        agent_name: 'NLU Agent',
        type: 'nlu',
        key: 'state_signals',
        value: [{ signal: 'mental_overload', confidence: 0.85 }],
        confidence: 0.85,
        reasoning: 'Resolved mental overload'
      }
    ];

    const result = await engine.execute(getBaseTrace(), context);

    expect(result.detectedEmotion?.primaryEmotion).toBe('overwhelmed');
    expect(result.detectedEmotion?.evidence).toContain('NLU signal: mental_overload (confidence: 0.85)');
    expect(result.detectedEmotion?.evidence).toContain('keyword: too much');
    expect(result.detectedEmotion?.evidence).toContain('linguistic cue: exclamation mark');
  });

  it('should prioritize current expressions over historical beliefs (Recency Priority)', async () => {
    const context = getBaseContext('I am actually feeling good and calm today!');
    context.observations = [
      {
        agent_name: 'NLU Agent',
        type: 'nlu',
        key: 'state_signals',
        value: [{ signal: 'calm', confidence: 0.8 }],
        confidence: 0.8,
        reasoning: 'Resolved calm'
      }
    ];
    // Historical HUPS belief shows anxiety/fatigue
    context.profile_beliefs = [
      {
        dimension: 'emotion',
        belief_value: 'User is frequently anxious',
        confidence: 0.9
      }
    ];

    const result = await engine.execute(getBaseTrace(), context);

    // Current happy signals (calm NLU signal + "good"/"calm" keywords + exclamation) must dominate
    expect(result.detectedEmotion?.primaryEmotion).toBe('happy');
    expect(result.detectedEmotion?.evidence).toContain('NLU signal: calm (confidence: 0.80)');
    expect(result.detectedEmotion?.evidence).toContain('keyword: good');
    
    // Anxious should score much lower because profile belief has a weight of only 15% (0.9 * 0.15 = 0.135)
    // whereas happy has NLU (0.8 * 0.6 = 0.48) + Linguistic (1.0 * 0.25 = 0.25) = 0.73
    const anxiousScore = result.detectedEmotion?.secondaryEmotion;
    expect(anxiousScore).not.toBe('happy');
  });

  it('should fallback to "uncertain" if no emotion matches above the threshold', async () => {
    const context = getBaseContext('Hello, is anyone there?');
    context.observations = [];

    const result = await engine.execute(getBaseTrace(), context);

    expect(result.detectedEmotion?.primaryEmotion).toBe('uncertain');
    expect(result.detectedEmotion?.confidence).toBe(0.5);
    expect(result.detectedEmotion?.evidence).toContain('No core emotion score exceeded the threshold of 0.35');
    expect(result.emotions).toEqual(['uncertain']);
  });

  it('should identify a secondary emotion if it is distinct and above the threshold', async () => {
    const context = getBaseContext('I am tired and anxious.');
    context.observations = [
      {
        agent_name: 'NLU Agent',
        type: 'nlu',
        key: 'state_signals',
        value: [
          { signal: 'low_energy', confidence: 0.8 },
          { signal: 'uncertainty', confidence: 0.7 }
        ],
        confidence: 0.8,
        reasoning: 'Resolved signals'
      }
    ];

    const result = await engine.execute(getBaseTrace(), context);

    expect(result.detectedEmotion?.primaryEmotion).toBe('tired');
    expect(result.detectedEmotion?.secondaryEmotion).toBe('anxious');
    expect(result.emotions).toContain('tired');
    expect(result.emotions).toContain('anxious');
  });

  it('should boost intensity when ALL CAPS words or multiple intensifiers are present', async () => {
    const context = getBaseContext('I am REALLY EXCITED!');
    context.observations = [
      {
        agent_name: 'NLU Agent',
        type: 'nlu',
        key: 'state_signals',
        value: [{ signal: 'high_engagement', confidence: 0.8 }],
        confidence: 0.8,
        reasoning: 'High engagement'
      }
    ];

    const result = await engine.execute(getBaseTrace(), context);

    expect(result.detectedEmotion?.primaryEmotion).toBe('excited');
    expect(result.detectedEmotion?.intensity).toBe(1.0); // Boosted to max cap 1.0 due to NLU score + intensifier + exclamation + ALL CAPS
    expect(result.detectedEmotion?.evidence).toContain('intensifier: really');
    expect(result.detectedEmotion?.evidence).toContain('linguistic cue: ALL CAPS text');
    expect(result.detectedEmotion?.evidence).toContain('linguistic cue: exclamation mark');
  });
});
