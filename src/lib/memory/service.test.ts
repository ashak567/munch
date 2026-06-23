import { vi, describe, it, expect, beforeEach } from 'vitest';
import { addOrReinforceMemory, decayMemories } from './service';

// Mock variables
let mockMemoriesData: any[] = [];
let upsertedMemoryPayload: any = null;
let updatedMemoryPayload: any = null;
let updatedMemoryId: string | null = null;

// Mock Gemini match engine
let mockMatchResponse = { match_id: null as string | null, merged_summary: null as string | null };

vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    constructor(public apiKey: string) {}
    getGenerativeModel = vi.fn().mockImplementation(() => {
      return {
        generateContent: vi.fn().mockImplementation(() => {
          return Promise.resolve({
            response: {
              text: () => JSON.stringify(mockMatchResponse)
            }
          });
        })
      };
    });
  }
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI
  };
});

// Mock Supabase Server helper
const mockQueryBuilder: any = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  insert: vi.fn().mockImplementation((payload) => {
    upsertedMemoryPayload = payload;
    return mockQueryBuilder;
  }),
  update: vi.fn().mockImplementation((payload) => {
    updatedMemoryPayload = payload;
    return mockQueryBuilder;
  }),
  then: (onfulfilled: any) => {
    return Promise.resolve({ data: mockMemoriesData, error: null }).then(onfulfilled);
  }
};

vi.mock('@/utils/supabase/server', () => {
  const mockSupabase = {
    from: vi.fn().mockImplementation((table) => {
      if (table === 'user_memories') {
        mockQueryBuilder.then = (onfulfilled: any) => {
          if (mockQueryBuilder.isSingle) {
            mockQueryBuilder.isSingle = false;
            return Promise.resolve({ data: mockMemoriesData[0] || null, error: null }).then(onfulfilled);
          }
          return Promise.resolve({ data: mockMemoriesData, error: null }).then(onfulfilled);
        };
        mockQueryBuilder.single = () => {
          mockQueryBuilder.isSingle = true;
          return mockQueryBuilder;
        };
        mockQueryBuilder.update = (payload: any) => {
          updatedMemoryPayload = payload;
          return mockQueryBuilder;
        };
        mockQueryBuilder.eq = (field: string, val: any) => {
          if (field === 'id') {
            updatedMemoryId = val;
          }
          return mockQueryBuilder;
        };
      }
      return mockQueryBuilder;
    })
  };
  return {
    createClient: vi.fn(() => Promise.resolve(mockSupabase))
  };
});

describe('Memory System Service Layer Tests', () => {
  beforeEach(() => {
    mockMemoriesData = [];
    upsertedMemoryPayload = null;
    updatedMemoryPayload = null;
    updatedMemoryId = null;
    mockMatchResponse = { match_id: null, merged_summary: null };
    vi.clearAllMocks();
  });

  it('should create a new memory if no semantic match exists', async () => {
    mockMemoriesData = [];
    const evidenceRef = {
      source_type: 'decision' as const,
      source_id: 'dec_123',
      timestamp: new Date().toISOString()
    };

    await addOrReinforceMemory(
      'user_123',
      'semantic',
      'Prefers green tea while coding',
      0.8,
      0.5,
      evidenceRef
    );

    expect(upsertedMemoryPayload).toBeDefined();
    expect(upsertedMemoryPayload.summary).toBe('Prefers green tea while coding');
    expect(upsertedMemoryPayload.confidence).toBe(0.8);
    expect(upsertedMemoryPayload.importance).toBe(0.5);
    expect(upsertedMemoryPayload.relevance_score).toBe(1.0);
    expect(upsertedMemoryPayload.evidence_refs).toHaveLength(1);
    expect(upsertedMemoryPayload.evidence_refs[0].source_id).toBe('dec_123');
  });

  it('should reinforce an existing memory on semantic match', async () => {
    const existingMemory = {
      id: 'mem_999',
      summary: 'Likes hot tea',
      confidence: 0.6,
      importance: 0.4,
      evidence_refs: [
        { source_type: 'decision', source_id: 'dec_111', timestamp: '2026-06-22' }
      ]
    };
    mockMemoriesData = [existingMemory];
    
    // Setup Gemini mock to return match
    mockMatchResponse = {
      match_id: 'mem_999',
      merged_summary: 'Prefers hot tea while working late'
    };

    const newEvidenceRef = {
      source_type: 'feedback' as const,
      source_id: 'feed_222',
      timestamp: new Date().toISOString()
    };

    await addOrReinforceMemory(
      'user_123',
      'semantic',
      'Prefers hot tea while working late',
      0.7,
      0.6,
      newEvidenceRef
    );

    expect(updatedMemoryPayload).toBeDefined();
    expect(updatedMemoryId).toBe('mem_999');
    
    // Verify summary is updated to merged summary
    expect(updatedMemoryPayload.summary).toBe('Prefers hot tea while working late');
    
    // Importance is max of both: max(0.4, 0.6) = 0.6
    expect(updatedMemoryPayload.importance).toBe(0.6);
    
    // Confidence reinforcement formula: 0.6 + (1.0 - 0.6) * 0.7 * 0.5 = 0.6 + 0.4 * 0.35 = 0.6 + 0.14 = 0.74
    expect(updatedMemoryPayload.confidence).toBeCloseTo(0.74, 2);
    
    // Evidence references are merged
    expect(updatedMemoryPayload.evidence_refs).toHaveLength(2);
    expect(updatedMemoryPayload.evidence_refs[1].source_id).toBe('feed_222');
  });

  it('should decay relevance and confidence of unreferenced memories', async () => {
    const now = new Date();
    // last referenced 5 days ago
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    
    mockMemoriesData = [
      {
        id: 'mem_dec',
        relevance_score: 1.0,
        confidence: 0.8,
        last_referenced_at: fiveDaysAgo
      }
    ];

    await decayMemories('user_123');

    expect(updatedMemoryPayload).toBeDefined();
    // relevance decayed = 1.0 * e^(-0.02 * 5) = e^(-0.1) = ~0.90
    expect(updatedMemoryPayload.relevance_score).toBeCloseTo(0.9048, 2);
    // confidence decayed = 0.8 * e^(-0.01 * 5) = 0.8 * e^(-0.05) = 0.8 * 0.9512 = ~0.76
    expect(updatedMemoryPayload.confidence).toBeCloseTo(0.761, 2);
  });
});
