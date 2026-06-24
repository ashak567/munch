import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MunchOrchestrator, resolveConflicts } from './service';
import { Agent, AgentObservation, ContextPackage } from './types';

// Mock getProfile
vi.mock('../hup/service', () => ({
  getProfile: vi.fn().mockResolvedValue([
    {
      id: 'b1',
      user_id: 'user_123',
      dimension: 'emotional_pattern',
      key: 'decision_anxiety',
      value: 'high',
      confidence: 0.8,
      evidence_count: 3,
      evidence_refs: [],
      created_at: '',
      updated_at: ''
    }
  ])
}));

// Mock retrieveMemories
vi.mock('../memory/service', () => ({
  retrieveMemories: vi.fn().mockResolvedValue([
    {
      id: 'm1',
      user_id: 'user_123',
      memory_type: 'episodic',
      summary: 'Prefers reading at a cozy coffee shop',
      confidence: 0.9,
      importance: 0.7,
      relevance_score: 1.0,
      evidence_refs: []
    }
  ])
}));

// Mock Supabase Server helper
const mockDecisionsData = [
  {
    id: 'dec_1',
    selected_option: 'Coffee shop',
    category: 'Activities',
    mascot: 'ollie',
    created_at: new Date().toISOString()
  }
];

vi.mock('@/utils/supabase/server', () => {
  const mockSupabase = {
    from: vi.fn().mockImplementation((table) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: mockDecisionsData, error: null });
        })
      };
    })
  };
  return {
    createClient: vi.fn(() => Promise.resolve(mockSupabase))
  };
});

// Mock Gemini Shared Pipeline
let mockSharedPipelineObservations: AgentObservation[] = [];

vi.mock('./agents', async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    runSharedPipeline: vi.fn().mockImplementation(() => Promise.resolve(mockSharedPipelineObservations))
  };
});

vi.mock('../nlu/service', () => ({
  nluEngine: {
    analyze: vi.fn().mockResolvedValue([])
  }
}));

describe('Munch Orchestrator Service Tests', () => {
  beforeEach(() => {
    mockSharedPipelineObservations = [];
    vi.clearAllMocks();
  });

  it('should compile the context package correctly', async () => {
    const orchestrator = new MunchOrchestrator();
    mockSharedPipelineObservations = [
      {
        agent_name: 'NLU Agent',
        type: 'nlu',
        key: 'detected_category',
        value: 'Activities',
        confidence: 0.9,
        reasoning: 'Matches activities keywords'
      }
    ];

    const result = await orchestrator.orchestrate({
      user_id: 'user_123',
      user_input: 'Read a book at the café',
      options: ['Read a book at the café', 'Go for a run'],
      importance: 'Relaxation',
      emotional_state: 'calm',
      current_context: 'afternoon'
    });

    expect(result.context).toBeDefined();
    expect(result.context.user_id).toBe('user_123');
    expect(result.context.user_input).toBe('Read a book at the café');
    expect(result.context.profile_beliefs).toHaveLength(1);
    expect(result.context.profile_beliefs[0].key).toBe('decision_anxiety');
    expect(result.context.relevant_memories).toHaveLength(1);
    expect(result.context.relevant_memories[0].summary).toBe('Prefers reading at a cozy coffee shop');
    expect(result.context.decision_history).toHaveLength(1);
    expect(result.context.decision_history![0].selected_option).toBe('Coffee shop');
  });

  it('should resolve conflicts when competing observations are reported on the same key', () => {
    const observations: AgentObservation[] = [
      {
        agent_name: 'Emotion Agent',
        type: 'emotion',
        key: 'emotional_state',
        value: 'stressed',
        confidence: 0.8,
        reasoning: 'User mentioned feeling overwhelmed.'
      },
      {
        agent_name: 'Intent Agent',
        type: 'emotion',
        key: 'emotional_state',
        value: 'calm',
        confidence: 0.6,
        reasoning: 'User chose a calm option.'
      }
    ];

    const { conflicts, uncertainties } = resolveConflicts(observations);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].key).toBe('emotional_state');
    expect(conflicts[0].competing_observations).toHaveLength(2);
    expect(conflicts[0].uncertainty_level).toBe(0.7); // (0.8 + 0.6) / 2
    expect(uncertainties).toHaveLength(1);
    expect(uncertainties[0]).toContain("Conflict on key 'emotional_state'");
  });

  it('should not flag conflict if observations have the same value for a key', () => {
    const observations: AgentObservation[] = [
      {
        agent_name: 'Emotion Agent',
        type: 'emotion',
        key: 'emotional_state',
        value: 'stressed',
        confidence: 0.8,
        reasoning: 'User mentioned feeling overwhelmed.'
      },
      {
        agent_name: 'Intent Agent',
        type: 'emotion',
        key: 'emotional_state',
        value: 'stressed',
        confidence: 0.6,
        reasoning: 'User chose an option under stress.'
      }
    ];

    const { conflicts, uncertainties } = resolveConflicts(observations);

    expect(conflicts).toHaveLength(0);
    expect(uncertainties).toHaveLength(0);
  });

  it('should support registering custom independent agents and executing them concurrently', async () => {
    const orchestrator = new MunchOrchestrator();

    class CustomMockAgent implements Agent {
      name = 'Custom Agent';
      isSharedPipeline = false;

      async analyze(context: ContextPackage): Promise<AgentObservation[]> {
        return [
          {
            agent_name: 'Custom Agent',
            type: 'reasoning_hypothesis',
            key: 'custom_insight',
            value: 'user is trying to build a routine',
            confidence: 0.85,
            reasoning: 'Based on repetitive daily actions'
          }
        ];
      }
    }

    orchestrator.registerAgent(new CustomMockAgent());

    mockSharedPipelineObservations = [
      {
        agent_name: 'NLU Agent',
        type: 'nlu',
        key: 'detected_category',
        value: 'Activities',
        confidence: 0.9,
        reasoning: 'Matches activities keywords'
      }
    ];

    const result = await orchestrator.orchestrate({
      user_id: 'user_123',
      user_input: 'Read a book at the café',
      options: ['Read a book at the café', 'Go for a run']
    });

    expect(result.observations).toHaveLength(2);
    const customObs = result.observations.find(o => o.agent_name === 'Custom Agent');
    expect(customObs).toBeDefined();
    expect(customObs!.value).toBe('user is trying to build a routine');
  });
});
