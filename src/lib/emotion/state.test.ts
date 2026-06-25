import { describe, it, expect } from 'vitest';
import { EmotionalStateEngine } from './state';
import { CognitiveTrace, ContextPackage } from '../reflection/types';

describe('Emotional State Engine', () => {
  const engine = new EmotionalStateEngine();

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

  const getBaseContext = (): ContextPackage => ({
    user_id: 'user_123',
    user_input: '',
    user_name: 'Friend',
    user_nickname: 'Friend',
    options: [],
    profile_beliefs: [],
    relevant_memories: [],
    decision_history: []
  });

  it('should compute high stability (1.0) and "stable" consistency for single-emotion conversations', async () => {
    const trace = getBaseTrace();
    trace.detectedEmotion = {
      primaryEmotion: 'tired',
      confidence: 0.9,
      intensity: 0.8,
      evidence: ['keyword: tired']
    };

    const context = getBaseContext();
    context.chatHistory = [];

    const result = await engine.execute(trace, context);

    expect(result.emotionalState).toBeDefined();
    expect(result.emotionalState?.primaryEmotion).toBe('tired');
    expect(result.emotionalState?.stability).toBe(1.0);
    expect(result.emotionalState?.emotionalConsistency).toBe('stable');
    expect(result.emotionalState?.needsEmotionalValidation).toBe(false); // tired doesn't force validation by default unless anxious/sad/overwhelmed
    expect(result.emotionalState?.confidence).toBe(0.9);
    expect(result.emotionalState?.intensity).toBe(0.8);
  });

  it('should compute high stability (0.80) and "stable" consistency for shifting negative tones', async () => {
    const trace = getBaseTrace();
    trace.detectedEmotion = {
      primaryEmotion: 'overwhelmed',
      confidence: 0.85,
      intensity: 0.75,
      evidence: ['keyword: stressed']
    };

    const context = getBaseContext();
    context.chatHistory = [
      {
        sender: 'mascot',
        content: 'I understand',
        nlu_metadata: { emotions: ['tired'] }
      }
    ];

    const result = await engine.execute(trace, context);

    expect(result.emotionalState?.stability).toBe(0.80);
    expect(result.emotionalState?.emotionalConsistency).toBe('stable');
    expect(result.emotionalState?.needsEmotionalValidation).toBe(true); // overwhelmed forces validation
  });

  it('should compute medium stability (0.60) and "mixed" consistency for shifting positive to negative/uncertain tones', async () => {
    const trace = getBaseTrace();
    trace.detectedEmotion = {
      primaryEmotion: 'uncertain',
      confidence: 0.7,
      intensity: 0.5,
      evidence: ['keyword: unsure']
    };

    const context = getBaseContext();
    context.chatHistory = [
      {
        sender: 'mascot',
        content: 'Awesome!',
        nlu_metadata: { emotions: ['excited'] }
      },
      {
        sender: 'mascot',
        content: 'Take your time.',
        nlu_metadata: { emotions: ['anxious'] }
      }
    ];

    const result = await engine.execute(trace, context);

    expect(result.emotionalState?.stability).toBe(0.60);
    expect(result.emotionalState?.emotionalConsistency).toBe('mixed');
    expect(result.emotionalState?.needsEmotionalValidation).toBe(true);
  });

  it('should compute low stability (0.25) and "conflicted" consistency for positive-negative emotional contradictions', async () => {
    const trace = getBaseTrace();
    trace.detectedEmotion = {
      primaryEmotion: 'happy',
      confidence: 0.8,
      intensity: 0.6,
      evidence: ['keyword: fine']
    };

    const context = getBaseContext();
    context.chatHistory = [
      {
        sender: 'mascot',
        content: 'I hear you.',
        nlu_metadata: { emotions: ['sad'] }
      }
    ];

    const result = await engine.execute(trace, context);

    expect(result.emotionalState?.stability).toBe(0.25);
    expect(result.emotionalState?.emotionalConsistency).toBe('conflicted');
    expect(result.emotionalState?.needsEmotionalValidation).toBe(true);
    expect(result.emotionalState?.evidence).toContain('emotional stability: low consistency (direct contradiction)');
  });
});
