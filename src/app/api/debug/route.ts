import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * Diagnostic endpoint to verify database tables, RLS policies, and migration state.
 * GET /api/debug
 * This should be removed before final production deployment.
 */
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {}
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // 1. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    results['1-auth'] = {
      status: user ? 'SUCCESS' : 'FAILED',
      user_id: user?.id || null,
      auth_error: authError?.message || null
    }

    if (!user) {
      return NextResponse.json({ results, note: 'Not authenticated — remaining checks skipped.' }, { status: 401 })
    }

    // 2. Check core tables exist by attempting a simple select
    const tables = [
      'users',
      'decisions',
      'options',
      'feedback',
      'preferences',
      'user_observations',
      'user_beliefs',
      'user_memories'
    ]

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .limit(0)

        results[`2-table-${table}`] = {
          status: error ? 'FAILED' : 'SUCCESS',
          exists: !error,
          row_count: count,
          error_message: error?.message || null,
          error_code: error?.code || null,
          error_hint: error?.hint || null
        }
      } catch (err) {
        results[`2-table-${table}`] = {
          status: 'EXCEPTION',
          exists: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    }

    // 3. Verify RLS allows insert on decisions
    // We don't actually insert — we just verify the user_id matches auth.uid()
    results['3-rls-user-match'] = {
      status: 'INFO',
      user_id: user.id,
      note: 'If the user_id in the insert payload matches auth.uid(), RLS should allow the insert on all tables with (auth.uid() = user_id) policies.'
    }

    // 4. Test a lightweight read on each cognitive table for the current user
    const cognitiveChecks = [
      { table: 'user_observations', label: 'HUPS observations' },
      { table: 'user_beliefs', label: 'HUPS beliefs' },
      { table: 'user_memories', label: 'Memory entries' }
    ]

    for (const check of cognitiveChecks) {
      try {
        const { data, error, count } = await supabase
          .from(check.table)
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .limit(1)

        results[`4-cognitive-${check.table}`] = {
          status: error ? 'FAILED' : 'SUCCESS',
          label: check.label,
          user_records: count || 0,
          error_message: error?.message || null,
          error_code: error?.code || null
        }
      } catch (err) {
        results[`4-cognitive-${check.table}`] = {
          status: 'EXCEPTION',
          label: check.label,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    }

    // 5. Check decisions table schema by trying to select known columns
    try {
      const { data, error } = await supabase
        .from('decisions')
        .select('id, user_id, category, selected_option, reinforcement_message, reasoning, encouragement, follow_up_question, mascot, importance, created_at')
        .eq('user_id', user.id)
        .limit(1)

      results['5-decisions-schema'] = {
        status: error ? 'FAILED' : 'SUCCESS',
        all_columns_accessible: !error,
        error_message: error?.message || null,
        error_code: error?.code || null,
        error_hint: error?.hint || null,
        note: 'If FAILED with column not found, a migration has not been applied.'
      }
    } catch (err) {
      results['5-decisions-schema'] = {
        status: 'EXCEPTION',
        error: err instanceof Error ? err.message : String(err)
      }
    }

    // 6. Environment check
    results['6-env'] = {
      status: 'SUCCESS',
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_gemini_api_key: !!process.env.GEMINI_API_KEY
    }

    const elapsed = Date.now() - startTime
    results['_meta'] = {
      elapsed_ms: elapsed,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({ results })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      results
    }, { status: 500 })
  }
}
