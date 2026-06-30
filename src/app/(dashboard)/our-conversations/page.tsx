'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MessageSquare, 
  Calendar, 
  ChevronRight, 
  AlertTriangle,
  History
} from 'lucide-react'
import Mascot from '@/components/Mascot'

interface ConversationSession {
  id: string
  status: string
  state: string
  created_at: string
  updated_at: string
  primaryMascot: string
  activeTopicKey: string
  preview: string
  last_activity: string
}

export default function OurConversationsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/chats')
      if (!res.ok) {
        throw new Error('Failed to retrieve conversation library.')
      }
      const data = await res.json()
      setSessions(data.chats || [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Unable to load your conversation sessions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const formatLastActivity = (dateString: string) => {
    const d = new Date(dateString)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (d.toDateString() === today.toDateString()) {
      return `Today at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
    }
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTopicDisplayName = (key: string) => {
    switch (key) {
      case 'food': return 'Food & Nutrition 🍎'
      case 'career': return 'Career & Goals 💼'
      case 'study': return 'Studies & Focus 📚'
      case 'general':
      default:
        return 'General Chat 🌿'
    }
  }

  return (
    <div className="flex-grow flex flex-col h-[100dvh] relative overflow-hidden px-4 md:px-6 py-6 select-none max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-white/40 pb-4 mb-6">
        <div>
          <h2 className="font-display font-black text-2xl text-charcoal">
            Conversation Library
          </h2>
          <p className="text-2xs text-charcoal/50 font-bold uppercase tracking-wider block mt-1">
            Browse and reopen previous chat sessions with your companions.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2 bg-red-500/15 border border-red-500/30 text-red-700 rounded-xl p-3 text-2xs mb-4 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sessions List Container */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-2xs text-charcoal/40 font-bold uppercase">Loading library...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 px-4 bg-white/40 border border-white/60 rounded-3xl shadow-sm">
            <MessageSquare className="w-12 h-12 text-charcoal/20 mb-4 animate-float" />
            <h3 className="font-display font-black text-base text-charcoal">No sessions started yet</h3>
            <p className="text-xs text-charcoal/40 max-w-xs mt-2 leading-relaxed">
              Start a new conversation in the dashboard. It will automatically show up in your library here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sessions.map((chat) => (
              <div
                key={chat.id}
                onClick={() => router.push(`/dashboard?chatId=${chat.id}`)}
                className="glass-card bg-white/80 border border-white/90 rounded-2xl p-4 flex items-start gap-3.5 hover:shadow-md hover:border-primary/20 active:scale-[0.98] transition-all cursor-pointer shadow-3xs group relative"
              >
                {/* Companion Avatar */}
                <div className="flex-shrink-0 mt-0.5">
                  <Mascot character={chat.primaryMascot as any} expression="idle" size={54} className="drop-shadow-2xs" />
                </div>

                {/* Session Details */}
                <div className="flex-grow min-w-0 pr-4">
                  <span className="text-[10px] font-bold text-primary-dark/80 block uppercase tracking-wider mb-0.5">
                    {getTopicDisplayName(chat.activeTopicKey)}
                  </span>
                  
                  <h4 className="font-display font-black text-sm text-charcoal leading-tight truncate">
                    Conversation Session
                  </h4>

                  <p className="text-2xs text-charcoal/50 truncate font-medium mt-1 leading-snug">
                    {chat.preview}
                  </p>

                  <div className="flex items-center gap-1.5 text-[9px] text-charcoal/40 font-bold uppercase mt-2.5">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{formatLastActivity(chat.last_activity)}</span>
                    {chat.status === 'active' && (
                      <span className="px-1.5 py-0.5 bg-primary/20 text-primary-dark rounded text-[8px] font-black tracking-wider uppercase ml-1 animate-pulse">
                        active
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow Right Indicator */}
                <ChevronRight className="w-4 h-4 text-charcoal/20 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all absolute right-4 top-1/2 -translate-y-1/2" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
