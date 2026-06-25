'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Send, 
  Sparkles, 
  RefreshCw, 
  MessageSquare, 
  RotateCcw,
  ArrowRight,
  TrendingUp,
  History,
  Lightbulb
} from 'lucide-react'
import Mascot, { MascotCharacter, MascotExpression } from '@/components/Mascot'
import { MotionTap, MotionCard } from '@/components/motion/MotionWrapper'

interface ChatMessage {
  id: string
  chat_id: string
  sender: 'user' | 'mascot'
  content: string
  mascot_character: MascotCharacter | null
  mascot_expression: MascotExpression | null
  created_at: string
  nlu_metadata?: {
    emotions?: string[]
    readinessScore?: number
    readinessThreshold?: number
    reflections?: Array<{
      observation: string
      reflection: string
      confidence: number
      type: string
    }>
  }
}

interface PathCandidate {
  text: string
  tags: string[]
}

const TYPING_MESSAGES: Record<string, string> = {
  pandy: '🐼 Pandy is sitting with your energy...',
  ollie: '🦉 Ollie is putting the pieces together...',
  munch: '🍀 Munch is finding gentle paths...',
  ellie: '🐘 Ellie is holding safe space for you...',
  dobby: '🐶 Dobby is cheering you on...',
  froggy: '🐸 Froggy is breathing in calm...',
  bubbles: '🐟 Bubbles is flowing with your thoughts...',
  chicky: '🐤 Chicky is chirping with joy...',
  coco: '🐱 Coco is exploring possibilities...'
}

const MASCOT_NAMES: Record<string, string> = {
  munch: 'Munch',
  ollie: 'Ollie',
  ellie: 'Ellie',
  pandy: 'Pandy',
  dobby: 'Dobby',
  coco: 'Coco',
  froggy: 'Froggy',
  bubbles: 'Bubbles',
  chicky: 'Chicky',
}

export default function DashboardPage() {
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Chat states
  const [chatId, setChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  // Cognitive Trace states
  const [activeMascot, setActiveMascot] = useState<MascotCharacter>('munch')
  const [activeExpression, setActiveExpression] = useState<MascotExpression>('idle')
  const [currentState, setCurrentState] = useState<string>('Listening')
  const [possiblePaths, setPossiblePaths] = useState<PathCandidate[]>([])
  const [visiblePaths, setVisiblePaths] = useState<PathCandidate[]>([])
  
  // Adaptive Readiness
  const [readinessScore, setReadinessScore] = useState(0)
  const [readinessThreshold, setReadinessThreshold] = useState(0.65)
  const [structuredReflections, setStructuredReflections] = useState<any[]>([])

  // UI / Interactive Selection states
  const [shuffling, setShuffling] = useState(false)
  const [shuffledIndex, setShuffledIndex] = useState(-1)
  const [selectedPathText, setSelectedPathText] = useState<string | null>(null)
  
  // "Today I Learned" (TIL) state
  const [tilMessage, setTilMessage] = useState<string | null>(null)

  // Load chat and messages on mount
  const fetchChat = async () => {
    try {
      setInitializing(true)
      const res = await fetch('/api/chat')
      if (res.ok) {
        const data = await res.json()
        setChatId(data.chat.id)
        setCurrentState(data.chat.state || 'Listening')
        setMessages(data.messages)
        
        const metadata = data.chat.metadata || {}
        setActiveMascot(metadata.lastMascot || 'munch')
        setPossiblePaths(metadata.possiblePaths || [])
      }
    } catch (err) {
      console.error('[DashboardChat] Failed to load chat:', err)
    } finally {
      setInitializing(false)
    }
  }

  useEffect(() => {
    fetchChat()
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, visiblePaths, shuffling])

  // Staggered paths reveal animation
  useEffect(() => {
    if (possiblePaths.length > 0 && currentState === 'Emerging Paths') {
      setVisiblePaths([])
      let idx = 0
      const timer = setInterval(() => {
        if (idx < possiblePaths.length) {
          setVisiblePaths(prev => [...prev, possiblePaths[idx]])
          idx++
        } else {
          clearInterval(timer)
        }
      }, 800) // 800ms pause between paths

      return () => clearInterval(timer)
    } else {
      setVisiblePaths([])
    }
  }, [possiblePaths, currentState])

  // Submit Message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || loading) return

    // Optimistically insert user message locally
    const tempUserMsg: ChatMessage = {
      id: Math.random().toString(),
      chat_id: chatId || '',
      sender: 'user',
      content: trimmed,
      mascot_character: null,
      mascot_expression: null,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, tempUserMsg])
    setInputValue('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed })
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        setCurrentState(data.state)
        setActiveMascot(data.mascotCharacter)
        setActiveExpression(data.mascotExpression)
        setPossiblePaths(data.possiblePaths || [])
        setReadinessScore(data.readinessScore || 0)
        setReadinessThreshold(data.readinessThreshold || 0.65)
        setStructuredReflections(data.reflections || [])
      }
    } catch (err) {
      console.error('[DashboardChat] Send failed:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle path selection (decide)
  const handleSelectPath = async (pathText: string) => {
    if (shuffling) return
    setSelectedPathText(pathText)
    setShuffling(true)

    // Trigger local slot-machine visual shuffle
    let shuffleCount = 0
    const interval = setInterval(() => {
      setShuffledIndex(prev => {
        let next = Math.floor(Math.random() * possiblePaths.length)
        if (next === prev && possiblePaths.length > 1) {
          next = (next + 1) % possiblePaths.length
        }
        return next
      })
      shuffleCount++
      if (shuffleCount > 15) {
        clearInterval(interval)
      }
    }, 120)

    // Minimum delay of 2.2 seconds for selection delight
    const delay = new Promise(resolve => setTimeout(resolve, 2200))

    try {
      const decidePromise = fetch('/api/chat/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedPathText: pathText })
      }).then(res => res.json())

      const [decideResult] = await Promise.all([decidePromise, delay])
      
      clearInterval(interval)
      setShuffling(false)
      setSelectedPathText(null)
      setCurrentState('Archived')

      // Reload chat to display new messages and handle archived status
      await fetchChat()

      // Occasionally show "Today I Learned" (TIL) - e.g., if total decisions count matches
      const checkTIL = async () => {
        try {
          const prefRes = await fetch('/api/preferences')
          if (prefRes.ok) {
            const data = await prefRes.json()
            const total = data.totalDecisions || 0
            if (total > 0 && total % 8 === 0) {
              // Generate nice TIL
              setTilMessage(`You seem to become kinder to yourself after taking a short break. I'll remember that.`)
            }
          }
        } catch (e) {
          console.warn('Preferences fetch failed in checkTIL:', e)
        }
      }
      checkTIL()

    } catch (err) {
      console.error('[DashboardChat] Deciding failed:', err)
      setShuffling(false)
      setSelectedPathText(null)
    }
  }

  // Restart / Reset active chat thread
  const handleStartFresh = async () => {
    try {
      setInitializing(true)
      setTilMessage(null)
      // Archive current chat manually
      if (chatId) {
        await fetch('/api/chat/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedPathText: 'Start Fresh' })
        })
      }
      // Reload will automatically initialize a new chat session
      await fetchChat()
    } catch (err) {
      console.error('[DashboardChat] Reset failed:', err)
      setInitializing(false)
    }
  }

  if (initializing) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-16 space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-2xs text-charcoal/50">Listening to the quiet...</span>
      </div>
    )
  }

  return (
    <div className="flex-grow flex flex-col justify-between h-full max-h-[85vh] relative pb-20">
      
      {/* Header Profile Dashboard */}
      <div className="flex items-center justify-between border-b border-white/40 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Mascot character={activeMascot} expression={shuffling ? 'think' : activeExpression} size="sm" className="drop-shadow-sm" />
            {loading && (
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-dark opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-charcoal leading-tight">
              {MASCOT_NAMES[activeMascot] || 'Munch'}
            </h3>
            <span className="text-[10px] text-charcoal/50 font-semibold tracking-wider uppercase block">
              {currentState === 'Listening' && 'listening...'}
              {currentState === 'Exploring' && 'exploring possibilities...'}
              {currentState === 'Clarifying' && 'clarifying details...'}
              {currentState === 'Understanding' && 'sitting with you...'}
              {currentState === 'Emerging Paths' && 'gentle paths discovered'}
              {currentState === 'Archived' && 'session complete'}
            </span>
          </div>
        </div>

        <button
          onClick={handleStartFresh}
          className="p-2 text-charcoal/40 hover:text-charcoal/70 bg-white/40 border border-white/60 hover:bg-white/80 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 text-2xs font-bold"
          title="Start fresh conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Main Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-1 space-y-4 max-h-[50vh] pr-2">
        {messages.map((msg, index) => {
          const isMascot = msg.sender === 'mascot'
          const name = isMascot ? (MASCOT_NAMES[msg.mascot_character || ''] || 'Munch') : 'You'

          return (
            <div
              key={msg.id}
              className={`flex gap-3 items-start animate-fade-in ${
                isMascot ? 'justify-start' : 'justify-end'
              }`}
            >
              {/* Mascot Avatar Icon */}
              {isMascot && (
                <div className="mt-1 flex-shrink-0">
                  <Mascot character={msg.mascot_character || 'munch'} expression="idle" size="xs" />
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed border relative shadow-2xs ${
                  isMascot
                    ? 'bg-white/80 border-white/90 text-charcoal rounded-tl-none'
                    : 'bg-primary/20 border-primary/30 text-charcoal-dark rounded-tr-none text-right'
                }`}
              >
                {/* Header label */}
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${
                  isMascot ? 'text-secondary-dark' : 'text-primary-dark'
                }`}>
                  {name}
                </span>
                
                {/* Message Text content */}
                <p className="whitespace-pre-line font-medium leading-relaxed">
                  {msg.content}
                </p>

                {/* Cognitive observations logs rendering if present (debug / transparency helper) */}
                {isMascot && msg.nlu_metadata?.reflections && msg.nlu_metadata.reflections.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-charcoal/5 space-y-1">
                    <span className="text-[8px] font-bold text-charcoal/40 uppercase tracking-widest block flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" />
                      Cognitive Insights
                    </span>
                    <ul className="list-disc pl-3 text-[9px] text-charcoal/60 leading-normal space-y-0.5">
                      {msg.nlu_metadata.reflections.slice(0, 2).map((r, i) => (
                        <li key={i}>{r.reflection}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Shuffling Board Slot-machine selection view */}
        {shuffling && (
          <div className="w-full flex justify-center py-4 animate-fade-in">
            <div className="glass-card border-2 border-primary rounded-3xl p-5 shadow-lg w-full max-w-sm flex flex-col items-center justify-center">
              <span className="text-3xs font-black tracking-widest text-primary-dark uppercase block mb-2">
                REFLECTING ON PATH
              </span>
              <Mascot character={activeMascot} expression="think" size="md" className="mb-3" />
              <div className="w-full py-3 bg-white/70 border border-primary/20 rounded-2xl flex items-center justify-center min-h-[50px]">
                <span className="text-xs font-bold text-primary-dark animate-pulse text-center px-4 break-words">
                  {possiblePaths[shuffledIndex]?.text || selectedPathText || 'reflecting...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Emerging Paths Staggered reveal block */}
        {!shuffling && currentState === 'Emerging Paths' && possiblePaths.length > 0 && (
          <div className="glass-panel bg-white/40 border border-white/60 rounded-3xl p-5 shadow-xs space-y-4 animate-fade-in w-full max-w-md mx-auto">
            
            <div className="flex items-center gap-2 text-primary-dark justify-center">
              <Sparkles className="w-4 h-4 animate-float" />
              <span className="text-3xs font-black uppercase tracking-widest text-primary-dark">
                Paths to Explore
              </span>
            </div>

            {/* Staggered Path Chips */}
            <div className="flex flex-col gap-2">
              {visiblePaths.map((path, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPath(path.text)}
                  className="w-full text-left p-3 rounded-xl border border-charcoal/5 bg-white/80 hover:bg-white active:bg-cream text-charcoal transition-all hover:translate-y-[-1px] cursor-pointer shadow-2xs flex items-center gap-3 group"
                >
                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary-dark font-black text-[9px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold block truncate text-charcoal leading-snug group-hover:text-primary-dark">
                      {path.text}
                    </span>
                    {path.tags && path.tags.length > 0 && (
                      <span className="text-[8px] text-charcoal/40 font-semibold block capitalize mt-0.5">
                        {path.tags.slice(0, 2).join(' • ')}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-charcoal/30 group-hover:text-primary-dark group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
              
              {/* Typing placeholder during staggered load */}
              {visiblePaths.length < possiblePaths.length && (
                <div className="flex items-center gap-2 text-3xs text-charcoal/40 pl-2">
                  <span className="animate-bounce">🍃</span>
                  <span>revealing another path...</span>
                </div>
              )}
            </div>

            {/* Warmer Alternative Dialogue Buttons */}
            {visiblePaths.length === possiblePaths.length && (
              <div className="flex gap-2 pt-2 border-t border-charcoal/5">
                <button
                  onClick={() => {
                    setInputValue('Let\'s explore more paths')
                    setCurrentState('Exploring')
                  }}
                  className="flex-1 py-2 border border-charcoal/10 rounded-xl bg-white/80 hover:bg-white text-charcoal font-bold text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  Let&apos;s Explore More
                </button>
                <button
                  onClick={() => {
                    setInputValue('I\'m still thinking')
                    setCurrentState('Clarifying')
                  }}
                  className="flex-1 py-2 border border-charcoal/10 rounded-xl bg-white/80 hover:bg-white text-charcoal font-bold text-[10px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  I&apos;m Still Thinking
                </button>
              </div>
            )}
          </div>
        )}

        {/* Today I Learned (TIL) Bubble */}
        {tilMessage && (
          <div className="glass-panel bg-primary/10 border border-primary/20 rounded-2xl p-4 shadow-sm flex items-start gap-3 animate-fade-in w-full max-w-sm mx-auto">
            <Lightbulb className="w-5 h-5 text-primary-dark flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-black tracking-widest text-primary-dark uppercase mb-1">
                🍀 Today I Learned...
              </h4>
              <p className="text-2xs text-charcoal/80 leading-relaxed font-semibold">
                {tilMessage}
              </p>
              <span className="text-[9px] text-charcoal/40 italic block mt-1.5">
                I will remember that.
              </span>
            </div>
          </div>
        )}

        {/* Dynamic Typing Indicator */}
        {loading && (
          <div className="flex gap-2 items-center text-3xs text-charcoal/40 animate-pulse pl-1">
            <div className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-charcoal/40 rounded-full animate-bounce delay-75" />
              <span className="w-1.5 h-1.5 bg-charcoal/40 rounded-full animate-bounce delay-150" />
              <span className="w-1.5 h-1.5 bg-charcoal/40 rounded-full animate-bounce delay-225" />
            </div>
            <span>{TYPING_MESSAGES[activeMascot] || 'Munch is thinking...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Footer Text Input box */}
      <form
        onSubmit={handleSendMessage}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/70 border border-white/80 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-md z-30 backdrop-blur-md"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.slice(0, 200))}
          placeholder={currentState === 'Archived' ? "Session completed. Click Reset to start fresh." : "Type what's on your mind..."}
          disabled={loading || currentState === 'Archived'}
          className="flex-1 text-xs bg-transparent border-none outline-none text-charcoal placeholder-charcoal/30 font-medium py-1.5 px-1 disabled:cursor-not-allowed"
        />

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[9px] text-charcoal/30 font-semibold select-none">
            {inputValue.length}/200
          </span>
          <MotionTap>
            <button
              type="submit"
              disabled={!inputValue.trim() || loading || currentState === 'Archived'}
              className="p-2 bg-primary hover:bg-primary-dark text-primary-dark font-bold rounded-xl border border-primary-dark cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </MotionTap>
        </div>
      </form>

    </div>
  )
}
