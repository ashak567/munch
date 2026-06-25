import { vi, describe, it, expect, beforeEach } from 'vitest';
import { analyzeContextFallback as realAnalyzeContextFallback } from './fallback';
import { runNLUPipeline } from './pipeline';
import { NLUEngine } from './service';
import { getEvidenceSourceQuality, applyContextHierarchy, resolveContradictions as realResolveContradictions, resolveNLUObservations as realResolveNLUObservations } from './resolver';
import { NLUObservationsOutput, NLUHistoryItem } from './types';

type ContextPackage = any;

// Mock serverEnv
vi.mock('@/lib/env', () => ({
  serverEnv: {
    GEMINI_API_KEY: 'MOCK_KEY'
  }
}));

// Mock Supabase server helper to isolate test environments
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

// Mock GoogleGenerativeAI
const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent
        };
      }
    }
  };
});
const mockContext = (partial: any): any => ({
  user_id: 'user_123',
  user_input: '',
  options: [],
  profile_beliefs: [],
  relevant_memories: [],
  decision_history: [],
  ...partial
});

const mockObservations = (partial: any): any => ({
  meanings: [],
  topics: [],
  entities: [],
  ambiguities: [],
  assumptions: [],
  missing_info: [],
  hidden_meanings: [],
  communication_purposes: [],
  state_signals: [],
  dynamics: [],
  curiosity_triggers: [],
  decision_context: [],
  perspectives: [],
  certainties: [],
  goals: [],
  obstacles: [],
  stakeholders: [],
  importances: [],
  relationship_references: [],
  reflections: [],
  readiness_signals: [],
  ...partial
});

const analyzeContextFallback = (context: any): NLUObservationsOutput => {
  return realAnalyzeContextFallback(mockContext(context));
};

const resolveContradictions = (observations: any, context: any): NLUObservationsOutput => {
  return realResolveContradictions(mockObservations(observations), mockContext(context));
};

const resolveNLUObservations = (observations: any, context: any, history: any[]): NLUObservationsOutput => {
  return realResolveNLUObservations(mockObservations(observations), mockContext(context), history);
};

describe('NLU Engine - Local Fallback Parser', () => {
  it('should extract fatigue meanings and signals from "I am tired"', () => {
    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I am tired and exhausted',
      options: []
    };

    const result = analyzeContextFallback(context);

    // 1. Meaning
    expect(result.meanings).toHaveLength(1);
    expect(result.meanings[0].possible_meanings).toContainEqual({
      interpretation: 'physical exhaustion',
      confidence: 0.8
    });

    // 9. State Signal
    const lowEnergySignal = result.state_signals.find(s => s.signal === 'low_energy');
    expect(lowEnergySignal).toBeDefined();
    expect(lowEnergySignal!.confidence).toBeGreaterThan(0.8);
  });

  it('should extract decision fatigue meanings and decision context from vague input with options', () => {
    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I don\'t know what to do',
      options: ['Go to school', 'Take a break']
    };

    const result = analyzeContextFallback(context);

    // 12. Decision Context
    expect(result.decision_context).toHaveLength(1);
    expect(result.decision_context[0].decision_present).toBe(true);
    expect(result.decision_context[0].complexity).toBe('medium');

    // 6. Missing Info
    const priorityGap = result.missing_info.find(g => g.information_gap.includes('criteria'));
    expect(priorityGap).toBeDefined();
  });

  it('should detect ambiguity and implicit/hidden meaning for deflective inputs like "I\'m fine"', () => {
    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I am fine, seriously.',
      options: []
    };

    const result = analyzeContextFallback(context);

    // 4. Ambiguity
    expect(result.ambiguities).toHaveLength(1);
    expect(result.ambiguities[0].ambiguous_phrase).toBe('fine');

    // 7. Hidden Meaning
    expect(result.hidden_meanings).toHaveLength(1);
    expect(result.hidden_meanings[0].possible_implicit_meanings).toContain(
      'I am feeling overwhelmed but don\'t want to talk about it.'
    );
  });

  it('should identify cognitive assumptions in statements with absolute constraints like "never" or "must"', () => {
    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I must succeed otherwise it is a disaster',
      options: []
    };

    const result = analyzeContextFallback(context);

    // 5. Assumption
    expect(result.assumptions).toHaveLength(2); // disaster/extreme + must/should
    const catastrophe = result.assumptions.find(a => a.assumption.includes('All-or-nothing'));
    const obligation = result.assumptions.find(a => a.assumption.includes('obligation'));
    expect(catastrophe).toBeDefined();
    expect(obligation).toBeDefined();
  });

  it('should match entities in memory context', () => {
    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'Maybe I\'ll read at the cafe',
      options: [],
      relevant_memories: [
        {
          id: 'mem_cafe_1',
          user_id: 'user_123',
          memory_type: 'episodic',
          summary: 'Prefers reading at a cozy coffee shop',
          confidence: 0.95,
          importance: 0.7,
          relevance_score: 1.0,
          evidence_refs: []
        }
      ]
    };

    const result = analyzeContextFallback(context);

    // 3. Entities
    const cafeEntity = result.entities.find(e => e.entity_name === 'Cozy Coffee Shop');
    expect(cafeEntity).toBeDefined();
    expect(cafeEntity!.entity_type).toBe('location');
    expect(cafeEntity!.connected_memory_ids).toContain('mem_cafe_1');
  });
});

describe('NLU Engine - Gemini Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse Gemini JSON observations output correctly when successful', async () => {
    const mockOutput = {
      meanings: [
        {
          possible_meanings: [{ interpretation: 'Gemini meaning', confidence: 0.95 }],
          confidence: 0.95,
          evidence: 'test evidence'
        }
      ],
      topics: [{ topic: 'career', confidence: 0.9, evidence: 'job mention' }],
      entities: [],
      ambiguities: [],
      assumptions: [],
      missing_info: [],
      hidden_meanings: [],
      communication_purposes: [{ purpose: 'venting', confidence: 0.88, evidence: 'vent snippet' }],
      state_signals: [],
      dynamics: [],
      curiosity_triggers: [],
      decision_context: [{ decision_present: false, confidence: 0.9, evidence: 'none' }]
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockOutput)
      }
    });

    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'Job interview soon',
      options: []
    };

    const result = await runNLUPipeline(context);

    expect(result.meanings).toHaveLength(1);
    expect(result.meanings[0].possible_meanings[0].interpretation).toBe('Gemini meaning');
    expect(result.topics[0].topic).toBe('career');
    expect(result.communication_purposes[0].purpose).toBe('venting');
  });

  it('should fall back to local parser when Gemini response is malformed', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'INVALID JSON STRING'
      }
    });

    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I am tired',
      options: []
    };

    const result = await runNLUPipeline(context);

    // Should gracefully fall back to local parser
    expect(result.meanings).toHaveLength(1);
    expect(result.meanings[0].possible_meanings[0].interpretation).toBe('physical exhaustion');
  });

  it('should fall back to local parser when Gemini throws an exception', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API Rate Limit Exceeded'));

    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I am tired',
      options: []
    };

    const result = await runNLUPipeline(context);

    expect(result.meanings).toHaveLength(1);
    expect(result.meanings[0].possible_meanings[0].interpretation).toBe('physical exhaustion');
  });
});

describe('NLU Engine - Service Mapping to Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map NLU pipeline outputs to standard AgentObservations', async () => {
    const mockOutput = {
      meanings: [
        {
          possible_meanings: [{ interpretation: 'Gemini meaning', confidence: 0.9 }],
          confidence: 0.9,
          evidence: 'Derived from: user_input'
        }
      ],
      topics: [{ topic: 'career', confidence: 0.8, evidence: 'Derived from: user_input' }],
      entities: [],
      ambiguities: [],
      assumptions: [],
      missing_info: [],
      hidden_meanings: [],
      communication_purposes: [],
      state_signals: [],
      dynamics: [],
      curiosity_triggers: [],
      decision_context: [{ decision_present: true, decision_type: 'career decision', complexity: 'high', confidence: 0.95, evidence: 'Derived from: user_input' }]
    };

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify(mockOutput)
      }
    });

    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'Job interview',
      options: []
    };

    const engine = new NLUEngine();
    const observations = await engine.analyze(context);

    // Verify format
    expect(observations).toHaveLength(3); // meanings, topics, decision_context
    for (const obs of observations) {
      expect(obs.agent_name).toBe('NLU Agent');
      expect(obs.type).toBe('nlu');
    }

    const meaningsObs = observations.find(o => o.key === 'meanings');
    const topicsObs = observations.find(o => o.key === 'topics');
    const decisionObs = observations.find(o => o.key === 'decision_context');

    expect(meaningsObs).toBeDefined();
    expect(meaningsObs!.confidence).toBe(0.9);
    expect(meaningsObs!.value).toHaveLength(1);

    expect(topicsObs).toBeDefined();
    expect(topicsObs!.confidence).toBe(0.8);
    expect(topicsObs!.value[0].topic).toBe('career');

    expect(decisionObs).toBeDefined();
    expect(decisionObs!.confidence).toBe(0.95);
    expect(decisionObs!.reasoning).toContain('Complexity: high');
  });
});

describe('NLU Engine - Cognitive Architecture Safeguards & Rules', () => {
  it('should calculate evidence source quality and apply hierarchy constraints', () => {
    const userQuality = getEvidenceSourceQuality('Derived from: user_input');
    const memoryQuality = getEvidenceSourceQuality('Derived from: memory');
    const profileQuality = getEvidenceSourceQuality('Derived from: hups profile belief');

    expect(userQuality).toBe(1.0);
    expect(memoryQuality).toBe(0.6);
    expect(profileQuality).toBe(0.7);

    const adjustedConfidence = applyContextHierarchy(0.9, 'Derived from: memory');
    expect(adjustedConfidence).toBeCloseTo(0.54); // 0.9 * 0.6
  });

  it('should suppress historical anxiety/fatigue signals when current input explicitly signals calm', () => {
    const raw: any = {
      meanings: [],
      topics: [],
      entities: [],
      ambiguities: [],
      assumptions: [],
      missing_info: [],
      hidden_meanings: [],
      communication_purposes: [],
      state_signals: [
        {
          signal: 'cognitive_fatigue',
          confidence: 0.8,
          evidence: 'Derived from: hups profile belief'
        }
      ],
      dynamics: [],
      curiosity_triggers: [],
      decision_context: []
    };

    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'I feel completely calm and at ease today',
      options: [],
      emotional_state: 'calm'
    };

    // Apply context hierarchy (simulated step)
    const rawWithHierarchy = {
      ...raw,
      state_signals: raw.state_signals.map((s: any) => ({
        ...s,
        confidence: applyContextHierarchy(s.confidence, s.evidence) // 0.8 * 0.7 = 0.56
      }))
    };

    const suppressed = resolveContradictions(rawWithHierarchy, context);
    expect(suppressed.state_signals).toHaveLength(1);
    // 0.8 * 0.7 (profile quality) * 0.3 (suppression factor) = 0.168
    expect(suppressed.state_signals[0].confidence).toBeCloseTo(0.168);
    expect(suppressed.state_signals[0].uncertainty).toContain('Suppressed by current user state');

    // After full resolution, the signal is filtered out by safeguards threshold (< 0.3)
    const resolved = resolveNLUObservations(raw, context, []);
    expect(resolved.state_signals).toHaveLength(0);
  });

  it('should boost confidence of recurrent topics/signals and track drift', () => {
    const raw: any = {
      meanings: [],
      topics: [{ topic: 'career', confidence: 0.7, evidence: 'Derived from: user_input' }],
      entities: [],
      ambiguities: [],
      assumptions: [],
      missing_info: [],
      hidden_meanings: [],
      communication_purposes: [],
      state_signals: [{ signal: 'low_energy', confidence: 0.6, evidence: 'Derived from: user_input' }],
      dynamics: [],
      curiosity_triggers: [],
      decision_context: []
    };

    const history: NLUHistoryItem[] = [
      {
        id: 'h1',
        user_id: 'user_123',
        source_type: 'interaction',
        source_id: 's1',
        dimension: 'nlu',
        key: 'topics',
        observed_value: [{ topic: 'career', confidence: 0.8 }],
        confidence: 0.8,
        created_at: new Date().toISOString()
      },
      {
        id: 'h2',
        user_id: 'user_123',
        source_type: 'interaction',
        source_id: 's2',
        dimension: 'nlu',
        key: 'topics',
        observed_value: [{ topic: 'career', confidence: 0.85 }],
        confidence: 0.85,
        created_at: new Date().toISOString()
      }
    ];

    const context: ContextPackage = { user_id: 'user_123', user_input: 'Work stress', options: [] };
    const resolved = resolveNLUObservations(raw, context, history);

    // Baseline: 0.7 * 1.0 (input quality) = 0.7.
    // Boosted by recurrent topic: 0.7 + 0.08 = 0.78
    expect(resolved.topics[0].confidence).toBeCloseTo(0.78);
    expect(resolved.topics[0].uncertainty).toContain('Stable topic');
  });

  it('should cap hidden meaning confidence, preserve uncertainty, and threshold filter', () => {
    const raw: any = {
      meanings: [
        { possible_meanings: [], confidence: 0.2, evidence: 'Derived from: user_input' } // Should be filtered out (<0.3)
      ],
      topics: [],
      entities: [],
      ambiguities: [],
      assumptions: [],
      missing_info: [],
      hidden_meanings: [
        {
          explicit_meaning: 'Literal',
          possible_implicit_meanings: ['Implicit hidden meaning'],
          confidence: 0.9,
          evidence: 'Derived from: user_input'
        }
      ],
      communication_purposes: [],
      state_signals: [],
      dynamics: [],
      curiosity_triggers: [],
      decision_context: []
    };

    const context: ContextPackage = { user_id: 'user_123', user_input: 'Test', options: [] };
    const resolved = resolveNLUObservations(raw, context, []);

    // Filter check
    expect(resolved.meanings).toHaveLength(0);
    // Cap check
    expect(resolved.hidden_meanings).toHaveLength(1);
    expect(resolved.hidden_meanings[0].confidence).toBe(0.7); // capped at 0.7
  });

  it('should filter out redundant curiosity triggers and prioritize them by confidence', () => {
    const raw: any = {
      meanings: [],
      topics: [],
      entities: [],
      ambiguities: [],
      assumptions: [],
      missing_info: [],
      hidden_meanings: [],
      communication_purposes: [],
      state_signals: [],
      dynamics: [],
      curiosity_triggers: [
        {
          exploration_area: 'Options you are considering',
          exploration_rationale: 'We need options',
          confidence: 0.8,
          evidence: 'Derived from: user_input'
        },
        {
          exploration_area: 'Relationship dynamic with family',
          exploration_rationale: 'Understand family pressure',
          confidence: 0.6,
          evidence: 'Derived from: user_input'
        },
        {
          exploration_area: 'Decision timeline',
          exploration_rationale: 'Find urgency',
          confidence: 0.7,
          evidence: 'Derived from: user_input'
        }
      ],
      decision_context: []
    };

    const context: ContextPackage = {
      user_id: 'user_123',
      user_input: 'Vague text',
      options: ['Option A', 'Option B'], // Already has options!
      profile_beliefs: [
        {
          id: 'b1',
          user_id: 'user_123',
          dimension: 'relationship',
          key: 'family',
          value: 'supportive',
          confidence: 0.85,
          evidence_count: 5,
          evidence_refs: [],
          created_at: '',
          updated_at: ''
        }
      ] // Already has family relationship dynamic!
    };

    const resolved = resolveNLUObservations(raw, context, []);

    // Should filter out options trigger (options exist) and family trigger (family belief exists with confidence >= 0.7)
    // Only "Decision timeline" should remain
    expect(resolved.curiosity_triggers).toHaveLength(1);
    expect(resolved.curiosity_triggers[0].exploration_area).toBe('Decision timeline');
  });
});

describe('NLU Engine - 10 Cognitive Expansion Detections', () => {
  it('should detect perspective mindset and agency', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'I want to learn and grow', options: [] });
    expect(res.perspectives).toHaveLength(1);
    expect(res.perspectives[0].mindset).toBe('growth');
    expect(res.perspectives[0].agency).toBe('agency_active');

    const res2 = analyzeContextFallback({ user_id: 'u1', user_input: 'I have to do this, no choice', options: [] });
    expect(res2.perspectives).toHaveLength(1);
    expect(res2.perspectives[0].mindset).toBe('neutral');
    expect(res2.perspectives[0].agency).toBe('external_locus');
  });

  it('should detect certainty level and key doubts', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'I guess I will choose this maybe', options: [] });
    expect(res.certainties).toHaveLength(1);
    expect(res.certainties[0].certainty_level).toBe('hesitant');
    expect(res.certainties[0].key_doubts).toContain('unclear individual preference');

    const res2 = analyzeContextFallback({ user_id: 'u1', user_input: 'definitely for sure', options: [] });
    expect(res2.certainties).toHaveLength(1);
    expect(res2.certainties[0].certainty_level).toBe('absolute');
  });

  it('should extract explicit and implicit goals', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'I am planning to study tonight', options: [] });
    expect(res.goals).toHaveLength(1);
    expect(res.goals[0].goal).toBe('study tonight');
    expect(res.goals[0].type).toBe('explicit');

    const res2 = analyzeContextFallback({ user_id: 'u1', user_input: 'Should I cook or eat out?', options: ['cook', 'eat out'] });
    expect(res2.goals).toHaveLength(1);
    expect(res2.goals[0].goal).toBe('Choose between options');
    expect(res2.goals[0].type).toBe('implicit');
  });

  it('should detect obstacles in context', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'no money, too expensive', options: [] });
    expect(res.obstacles).toHaveLength(1);
    expect(res.obstacles[0].obstacle_type).toBe('financial');

    const res2 = analyzeContextFallback({ user_id: 'u1', user_input: 'very busy, tight schedule', options: [] });
    expect(res2.obstacles).toHaveLength(1);
    expect(res2.obstacles[0].obstacle_type).toBe('time');
  });

  it('should detect stakeholders and relation impact', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'my boss expects results', options: [] });
    expect(res.stakeholders).toHaveLength(1);
    expect(res.stakeholders[0].stakeholder_name).toBe('Manager/Boss');
    expect(res.stakeholders[0].impact_level).toBe('high');
  });

  it('should detect importance driver factors', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'must succeed to get approval', options: [] });
    expect(res.importances).toHaveLength(1);
    expect(res.importances[0].driver).toBe('social_pressure');
  });

  it('should detect relationship reference types', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'my partner expects me to help', options: [] });
    expect(res.relationship_references).toHaveLength(1);
    expect(res.relationship_references[0].target).toBe('Partner');
    expect(res.relationship_references[0].reference_type).toBe('pressure');
  });

  it('should detect user self-reflection depth', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'I realize I made a mistake', options: [] });
    expect(res.reflections).toHaveLength(1);
    expect(res.reflections[0].reflection_level).toBe('high');
    expect(res.reflections[0].reflection_type).toBe('introspection');
  });

  it('should detect emotional readiness signals', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'I am ready to decide', options: [] });
    expect(res.readiness_signals).toHaveLength(1);
    expect(res.readiness_signals[0].readiness_state).toBe('ready_to_decide');

    const res2 = analyzeContextFallback({ user_id: 'u1', user_input: 'so panicked and overwhelmed', options: [] });
    expect(res2.readiness_signals).toHaveLength(1);
    expect(res2.readiness_signals[0].readiness_state).toBe('needs_grounding');
  });

  it('should apply meaning importance scoring', () => {
    const res = analyzeContextFallback({ user_id: 'u1', user_input: 'I feel burnout', options: [] });
    expect(res.meanings).toHaveLength(1);
    expect(res.meanings[0].importance_score).toBe(0.8);
  });

  it('should age NLU observations and weight recent ones stronger than old ones', () => {
    const raw: any = {
      meanings: [
        {
          possible_meanings: [{ interpretation: 'physical exhaustion', confidence: 0.6 }],
          confidence: 0.6,
          evidence: 'Derived from: user_input',
          importance_score: 0.6
        }
      ],
      topics: [
        { topic: 'career', confidence: 0.7, evidence: 'Derived from: user_input' }
      ],
      entities: [],
      ambiguities: [],
      assumptions: [],
      missing_info: [],
      hidden_meanings: [],
      communication_purposes: [],
      state_signals: [],
      dynamics: [],
      curiosity_triggers: [],
      decision_context: [],
      perspectives: [],
      certainties: [],
      goals: [],
      obstacles: [],
      stakeholders: [],
      importances: [],
      relationship_references: [],
      reflections: [],
      readiness_signals: []
    };

    // history with an extremely old topic observation (50 days ago) and a recent meanings observation (now)
    const history: NLUHistoryItem[] = [
      {
        id: 'h1',
        user_id: 'user_123',
        source_type: 'interaction',
        source_id: 's1',
        dimension: 'nlu',
        key: 'topics',
        observed_value: [{ topic: 'career', confidence: 0.9 }],
        confidence: 0.9,
        created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString() // 50 days ago!
      },
      {
        id: 'h2',
        user_id: 'user_123',
        source_type: 'interaction',
        source_id: 's2',
        dimension: 'nlu',
        key: 'meanings',
        observed_value: [
          {
            possible_meanings: [{ interpretation: 'physical exhaustion', confidence: 0.8 }],
            confidence: 0.8,
            evidence: 'Derived from: user_input',
            importance_score: 0.8
          }
        ],
        confidence: 0.8,
        created_at: new Date().toISOString() // Now!
      }
    ];

    const context: ContextPackage = { user_id: 'user_123', user_input: 'Job interview and tired', options: [] };
    const resolved = resolveNLUObservations(raw, context, history);

    // 1. Topic 'career':
    // Past topic was 50 days ago. Its recency weight is Math.exp(-0.05 * 50) = 0.082.
    // Weighted score = 0.082 * 0.9 = 0.0738.
    // Since 0.0738 < 1.0, it should NOT trigger the boost of +0.08.
    // So confidence should remain at baseline (0.7)
    expect(resolved.topics[0].confidence).toBe(0.7);

    // 2. Meaning 'physical exhaustion':
    // Past meaning was today (now). Its recency weight is 1.0.
    // Weighted score = 1.0 * 0.8 = 0.8 >= 0.5.
    // It should receive a significant boost of +0.1, going from 0.6 to 0.7
    expect(resolved.meanings[0].possible_meanings[0].confidence).toBeCloseTo(0.7);
    expect(resolved.meanings[0].confidence).toBeCloseTo(0.7);
  });
});


