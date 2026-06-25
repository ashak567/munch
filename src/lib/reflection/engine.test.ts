import { vi, describe, it, expect } from 'vitest';
import {
  NluEnginePlugin,
  EmotionEnginePlugin,
  MascotSpecialistEngine,
  ReflectionEngine,
  runCognitivePipeline
} from './engine';
import { DecisionReadinessEngine } from './readiness';
import { MascotCharacter, MascotExpression } from '@/components/Mascot';
import { EmotionalStateEngine } from '../emotion/state';
import { EmotionRegulationEngine } from '../emotion/regulation';
import { EmotionDynamicsEngine } from '../emotion/dynamics';
import { CognitiveTrace, ContextPackage } from './types';

// Mock serverEnv
vi.mock('@/lib/env', () => ({
  serverEnv: {
    GEMINI_API_KEY: 'test-key'
  }
}));

// Mock Supabase server helper
vi.mock('@/utils/supabase/server', () => {
  const mockSupabase = {
    from: vi.fn().mockImplementation(() => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    })
  };
  return {
    createClient: vi.fn(() => Promise.resolve(mockSupabase))
  };
});

// Mock GoogleGenerativeAI to prevent actual API calls
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => JSON.stringify({
                paths: [
                  { text: 'Order Pizza', tags: ['comfort', 'easy'] },
                  { text: 'Make a Salad', tags: ['healthy', 'fresh'] }
                ],
                certainties: [
                  { certainty_level: 'absolute', key_doubts: [], confidence: 0.9, evidence: 'I don\'t know' }
                ],
                readiness_signals: [
                  { readiness_state: 'ready_to_decide', confidence: 0.9, evidence: 'order pizza' }
                ]
              })
            }
          })
        };
      }
    }
  };
});

describe('Cognitive Reflected Engine System', () => {
  it('should run the cognitive pipeline and determine correct mascot, threshold, and readiness', async () => {
    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I am tired and don\'t know whether to order pizza or make a salad',
      user_name: 'Friend',
      user_nickname: 'Friend',
      options: [],
      profile_beliefs: [],
      relevant_memories: [],
      decision_history: []
    };

    const initialTrace: CognitiveTrace = {
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
    };

    const pipeline = [
      new NluEnginePlugin(),
      new EmotionEnginePlugin(),
      new EmotionalStateEngine(),
      new EmotionRegulationEngine(),
      new EmotionDynamicsEngine(),
      new ReflectionEngine(),
      new MascotSpecialistEngine(),
      new DecisionReadinessEngine()
    ];

    const finalTrace = await runCognitivePipeline(pipeline, initialTrace, context);

    // Verify mascot selection based on tiredness
    expect(finalTrace.emotions).toContain('tired');
    expect(finalTrace.mascotCharacter).toBe('dobby'); // tired maps to encourage -> dobby
    expect(finalTrace.mascotExpression).toBe('wry'); // Pandy/Dobby tired = wry

    // Verify paths are merged in trace
    expect(finalTrace.generatedPaths).toHaveLength(2);
    expect(finalTrace.generatedPaths[0].text).toBe('Order Pizza');

    // Verify reflections are produced
    expect(finalTrace.reflections.length).toBeGreaterThan(0);
    const emotionRefl = finalTrace.reflections.find(r => r.type === 'emotion');
    expect(emotionRefl).toBeDefined();
    expect(emotionRefl?.reflection).toContain('energy is running a bit lower');

    // Verify adaptive threshold (Food category: low-stakes -> 0.50 threshold)
    expect(finalTrace.readinessThreshold).toBe(0.50);

    // Verify transition to Emerging Paths (as score should satisfy threshold)
    expect(finalTrace.state).toBe('Emerging Paths');
  });

  it('should adapt threshold for high-stakes career inputs', async () => {
    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I want to quit my job and move to a new country',
      user_name: 'Friend',
      user_nickname: 'Friend',
      options: [],
      profile_beliefs: [],
      relevant_memories: [],
      decision_history: []
    };

    const initialTrace: CognitiveTrace = {
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
    };

    const pipeline = [
      new NluEnginePlugin(),
      new DecisionReadinessEngine()
    ];

    const finalTrace = await runCognitivePipeline(pipeline, initialTrace, context);

    // High stakes job/quit keywords: 0.80 threshold
    expect(finalTrace.readinessThreshold).toBe(0.80);
  });
});
