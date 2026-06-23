import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getProfile } from '@/lib/hup/service';

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

    const beliefs = await getProfile(user.id);
    return NextResponse.json({ beliefs });
  } catch (error: any) {
    console.error('GET /api/profile failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
