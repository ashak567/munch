export type RelationshipLevel = 'new' | 'familiar' | 'trusted' | 'close';

export type NicknameReaction = 'love' | 'okay' | 'dislike';

export interface NicknameAffinity {
  id?: string;
  user_id: string;
  nickname: string;
  times_used: number;
  user_reaction: NicknameReaction | null;
  comfort_score: number;
  is_active: boolean;
  last_used_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface IdentityState {
  nickname: string;
  preferred_name: string;
  relationship_level: RelationshipLevel;
  relationship_score: number;
}
