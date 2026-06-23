import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Retrieve memories ordered by relevance and recency
    const { data: memories, error } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', user.id)
      .order('relevance_score', { ascending: false })
      .order('last_referenced_at', { ascending: false });

    if (error) {
      console.error('Error fetching memories:', error);
      throw error;
    }

    return NextResponse.json({ memories: memories || [] });
  } catch (error: any) {
    console.error('GET /api/memories failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
