import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    // Fetch all chats
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch latest message for each chat to show as a preview
    const chatsWithPreviews = await Promise.all(
      (chats || []).map(async (chat) => {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('content, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const latestMsg = messages && messages.length > 0 ? messages[0] : null
        
        return {
          id: chat.id,
          status: chat.status,
          state: chat.state,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          primaryMascot: chat.metadata?.primaryMascot || chat.metadata?.lastMascot || 'munch',
          activeTopicKey: chat.metadata?.activeTopicKey || 'general',
          preview: latestMsg ? latestMsg.content : "No messages yet.",
          last_activity: latestMsg ? latestMsg.created_at : chat.updated_at
        }
      })
    )

    return NextResponse.json({ chats: chatsWithPreviews })
  } catch (error: any) {
    console.error('GET /api/chats failed:', error)
    return NextResponse.json({ error: error.message || 'Server error.' }, { status: 500 })
  }
}
