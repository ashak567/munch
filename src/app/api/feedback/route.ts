import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { calculateNewScore, type FeedbackRating } from '@/utils/preferences'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to submit feedback.' },
        { status: 401 }
      )
    }

    // 2. Parse and validate body parameters
    const body = await request.json()
    const { decisionId, rating } = body

    if (!decisionId || !rating) {
      return NextResponse.json(
        { error: 'decisionId and rating are required.' },
        { status: 400 }
      )
    }

    const validRatings: FeedbackRating[] = ['love', 'okay', 'meh']
    if (!validRatings.includes(rating as FeedbackRating)) {
      return NextResponse.json(
        { error: 'Invalid rating. Supported ratings: love, okay, meh.' },
        { status: 400 }
      )
    }

    // 3. Fetch decision record and check ownership
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select('id, user_id, category, selected_option')
      .eq('id', decisionId)
      .single()

    if (decisionError || !decision) {
      return NextResponse.json(
        { error: 'Decision not found.' },
        { status: 404 }
      )
    }

    if (decision.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied. You do not own this decision.' },
        { status: 403 }
      )
    }

    // 4. Save feedback (upsert or insert)
    // Check if feedback already exists for this decision
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('id')
      .eq('decision_id', decisionId)
      .single()

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted for this decision.' },
        { status: 409 }
      )
    }

    const { data: feedbackRecord, error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        decision_id: decisionId,
        rating,
      })
      .select()
      .single()

    if (feedbackError) {
      console.error('Failed to save feedback:', feedbackError)
      return NextResponse.json(
        { error: 'Failed to record feedback.' },
        { status: 500 }
      )
    }

    // 5. Query the selected option to fetch its tags
    const { data: optionsData, error: optionsError } = await supabase
      .from('options')
      .select('tags')
      .eq('decision_id', decisionId)
      .eq('option_text', decision.selected_option)
      .single()

    const selectedOptionTags: string[] = optionsData?.tags || []

    if (selectedOptionTags.length > 0) {
      // Loop through each tag, fetch existing preference, and upsert
      for (const tag of selectedOptionTags) {
        const tagLower = tag.trim().toLowerCase()
        if (!tagLower) continue

        // Fetch existing preference for (user_id, category, tag)
        const { data: existingPref } = await supabase
          .from('preferences')
          .select('score')
          .eq('user_id', user.id)
          .eq('category', decision.category)
          .eq('tag', tagLower)
          .single()

        let currentScore = 0.0
        if (existingPref) {
          currentScore = Number(existingPref.score)
        }

        const newScore = calculateNewScore(currentScore, rating as FeedbackRating)

        // Upsert preference
        const { error: upsertError } = await supabase
          .from('preferences')
          .upsert({
            user_id: user.id,
            category: decision.category,
            tag: tagLower,
            score: newScore,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,category,tag'
          })

        if (upsertError) {
          console.error(`Failed to upsert preference for tag ${tagLower}:`, upsertError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      feedback: feedbackRecord,
    })
  } catch (error: any) {
    console.error('POST /api/feedback failed with error:', error)
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
