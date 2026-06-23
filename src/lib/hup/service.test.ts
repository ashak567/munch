import { vi, describe, it, expect, beforeEach } from 'vitest'
import { recalculateBelief } from './service'
import { createClient } from '@/utils/supabase/server'

// Setup global mock variables
let mockData: any = null
let mockError: any = null
let upsertedPayload: any = null
let deletedRef: any = null

const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockDelete = vi.fn()
const mockUpsert = vi.fn()

const mockQueryBuilder: any = {
  select: mockSelect,
  eq: mockEq,
  delete: mockDelete,
  upsert: mockUpsert,
  // Make it thenable so it can be awaited
  then: (onfulfilled: any) => {
    return Promise.resolve({ data: mockData, error: mockError }).then(onfulfilled);
  }
}

mockEq.mockReturnValue(mockQueryBuilder)
mockSelect.mockReturnValue(mockQueryBuilder)
mockDelete.mockReturnValue(mockQueryBuilder)
mockUpsert.mockImplementation((payload) => {
  upsertedPayload = payload
  return mockQueryBuilder
})

vi.mock('@/utils/supabase/server', () => {
  const mockSupabase = {
    from: vi.fn().mockImplementation((table) => {
      if (table === 'user_beliefs') {
        mockQueryBuilder.then = (onfulfilled: any) => {
          if (mockQueryBuilder.isDelete) {
            deletedRef = true
          }
          return Promise.resolve({ data: null, error: null }).then(onfulfilled);
        }
        mockQueryBuilder.isDelete = false
        mockQueryBuilder.delete = () => {
          mockQueryBuilder.isDelete = true
          return mockQueryBuilder
        }
      } else {
        mockQueryBuilder.then = (onfulfilled: any) => {
          return Promise.resolve({ data: mockData, error: mockError }).then(onfulfilled);
        }
      }
      return mockQueryBuilder
    })
  }
  return {
    createClient: vi.fn(() => Promise.resolve(mockSupabase))
  }
})

describe('HUPS Service Layer Tests', () => {
  beforeEach(() => {
    mockData = null
    mockError = null
    upsertedPayload = null
    deletedRef = null
    vi.clearAllMocks()
  })

  it('should delete belief if no observations exist', async () => {
    mockData = []
    
    await recalculateBelief('user_123', 'values', 'growth')

    expect(deletedRef).toBe(true)
    expect(upsertedPayload).toBeNull()
  })

  it('should calculate belief confidence with scale factor for a single observation', async () => {
    const now = new Date().toISOString()
    mockData = [
      {
        id: 'obs_1',
        observed_value: true,
        confidence: 1.0,
        created_at: now,
        source_type: 'decision'
      }
    ]

    await recalculateBelief('user_123', 'values', 'growth')

    expect(upsertedPayload).toBeDefined()
    expect(upsertedPayload.value).toBe(true)
    expect(upsertedPayload.evidence_count).toBe(1)
    
    // With 1 observation: totalWeight = 1.0
    // averageObsConfidence = 1.0
    // evidenceScale = 1 - e^(-0.5 * 1.0) = 1 - e^(-0.5) = 0.393
    // finalConfidence = 1.0 * 0.393 = ~0.39
    expect(upsertedPayload.confidence).toBeCloseTo(0.393, 2)
  })

  it('should calculate higher confidence for multiple observations of same value', async () => {
    const now = new Date().toISOString()
    mockData = [
      {
        id: 'obs_1',
        observed_value: true,
        confidence: 1.0,
        created_at: now,
        source_type: 'decision'
      },
      {
        id: 'obs_2',
        observed_value: true,
        confidence: 1.0,
        created_at: now,
        source_type: 'feedback'
      },
      {
        id: 'obs_3',
        observed_value: true,
        confidence: 1.0,
        created_at: now,
        source_type: 'conversation'
      }
    ]

    await recalculateBelief('user_123', 'values', 'growth')

    expect(upsertedPayload).toBeDefined()
    expect(upsertedPayload.evidence_count).toBe(3)
    
    // With 3 observations: totalWeight = 3.0
    // averageObsConfidence = 1.0
    // evidenceScale = 1 - e^(-0.5 * 3.0) = 1 - e^(-1.5) = 0.776
    // finalConfidence = 1.0 * 0.776 = ~0.78
    expect(upsertedPayload.confidence).toBeCloseTo(0.776, 2)
  })

  it('should apply time decay to older observations', async () => {
    const now = new Date()
    // 14 days ago observation (age = 14)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
    
    mockData = [
      {
        id: 'obs_old',
        observed_value: true,
        confidence: 1.0,
        created_at: fourteenDaysAgo,
        source_type: 'decision'
      }
    ]

    await recalculateBelief('user_123', 'values', 'growth')

    expect(upsertedPayload).toBeDefined()
    
    // Weight = e^(-0.05 * 14) = e^(-0.7) = 0.496
    // evidenceScale = 1 - e^(-0.5 * 0.496) = 1 - e^(-0.248) = 0.219
    // finalConfidence = 1.0 * 0.219 = ~0.22
    expect(upsertedPayload.confidence).toBeCloseTo(0.219, 2)
  })
})
