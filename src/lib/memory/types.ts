export type MemoryType = 'episodic' | 'semantic' | 'emotional' | 'relationship' | 'decision';

export interface EvidenceReference {
  source_type: 'decision' | 'feedback' | 'conversation' | 'interaction';
  source_id: string;
  timestamp: string;
  context?: string;
}

export interface UserMemory {
  id?: string;
  user_id: string;
  memory_type: MemoryType;
  summary: string;
  confidence: number;
  importance: number;
  relevance_score: number;
  evidence_refs: EvidenceReference[];
  last_referenced_at?: string;
  created_at?: string;
  updated_at?: string;
}
