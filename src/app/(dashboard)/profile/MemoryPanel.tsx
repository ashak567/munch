'use client'

import React, { useState, useEffect } from 'react'
import { 
  Brain, Clock, Shield, Award, Heart, MessageSquare, 
  HelpCircle, Compass, Sparkles, AlertCircle
} from 'lucide-react'

// BookOpen Icon replacement since we didn't import it
const BookOpen = (props: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

interface MemoryPanelProps {
  userId: string
}

interface UserMemory {
  id: string
  memory_type: 'episodic' | 'semantic' | 'emotional' | 'relationship' | 'decision'
  summary: string
  confidence: number
  importance: number
  relevance_score: number
  evidence_refs: Array<{
    source_type: string
    source_id: string
    timestamp: string
    context?: string
  }>
  last_referenced_at: string
  created_at: string
  updated_at: string
}

export default function MemoryPanel({ userId }: MemoryPanelProps) {
  const [memories, setMemories] = useState<UserMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMemory, setSelectedMemory] = useState<UserMemory | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    async function fetchMemories() {
      try {
        const res = await fetch('/api/memories')
        if (!res.ok) {
          throw new Error('Failed to retrieve memories')
        }
        const data = await res.json()
        setMemories(data.memories || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchMemories()
  }, [userId])

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="animate-spin text-4xl mb-3">🍀</div>
        <p className="text-sm text-charcoal/60">Recalling memories...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel rounded-3xl p-6 text-center text-coral-dark bg-coral/10 border border-coral-dark/20 my-4">
        <p className="font-semibold text-sm">Failed to recall memories: {error}</p>
      </div>
    )
  }

  const memoryTypes = [
    { value: 'all', label: 'All Memories', icon: Brain },
    { value: 'episodic', label: 'Episodic', icon: Clock },
    { value: 'semantic', label: 'Semantic', icon: BookOpen },
    { value: 'emotional', label: 'Emotional', icon: Heart },
    { value: 'relationship', label: 'Relationship', icon: Compass },
    { value: 'decision', label: 'Decision', icon: Award }
  ]

  const filteredMemories = filterType === 'all' 
    ? memories 
    : memories.filter(m => m.memory_type === filterType)

  const formatPercentage = (num: number) => `${Math.round(num * 100)}%`

  // Helper for type color styles
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'episodic':
        return { bg: 'bg-primary/10 text-primary-dark border-primary-dark/20', badge: 'bg-primary/20 text-primary-dark' }
      case 'semantic':
        return { bg: 'bg-secondary/10 text-secondary-dark border-secondary-dark/20', badge: 'bg-secondary/20 text-secondary-dark' }
      case 'emotional':
        return { bg: 'bg-coral/10 text-coral-dark border-coral-dark/20', badge: 'bg-coral/20 text-coral-dark' }
      case 'relationship':
        return { bg: 'bg-yellow/10 text-yellow-dark border-yellow-dark/20', badge: 'bg-yellow/20 text-yellow-dark' }
      case 'decision':
        return { bg: 'bg-blue-100 text-blue-800 border-blue-200', badge: 'bg-blue-200 text-blue-800' }
      default:
        return { bg: 'bg-charcoal/5 text-charcoal/70 border-charcoal/10', badge: 'bg-charcoal/10 text-charcoal/70' }
    }
  }



  return (
    <div className="space-y-6">
      {/* Time-decay Info Banner */}
      <div className="glass-panel rounded-3xl p-5 border border-white/50 relative overflow-hidden bg-white/40">
        <div className="flex gap-3 items-start">
          <div className="p-2 bg-secondary/20 text-secondary-dark rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-charcoal">Evolving Memory Lane</h3>
            <p className="text-2xs text-charcoal/70 leading-relaxed mt-1">
              Memories represent refined insights distilled from your choices and ratings. Recent experiences carry greater relevance. Memories that aren't reinforced over time will slowly decay in confidence and fade away.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Horizontal Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {memoryTypes.map((type) => {
          const Icon = type.icon
          const isActive = filterType === type.value
          return (
            <button
              key={type.value}
              onClick={() => setFilterType(type.value)}
              className={`flex items-center gap-1.5 py-2 px-4 rounded-full text-2xs font-bold border transition-all cursor-pointer flex-shrink-0 ${
                isActive
                  ? 'bg-primary border-primary-dark/30 text-primary-dark shadow-sm'
                  : 'bg-white/60 border-white/80 hover:bg-white text-charcoal/70 hover:text-charcoal'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{type.label}</span>
            </button>
          )
        })}
      </div>

      {/* Memories Grid List */}
      {filteredMemories.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-white/40 bg-white/20">
          <Brain className="w-10 h-10 text-charcoal/20 mx-auto mb-3" />
          <p className="text-xs text-charcoal/50 leading-relaxed max-w-xs mx-auto italic">
            Munch remembers nothing of this type yet. Share some decisions and observations, and Munch will begin to recall what matters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredMemories.map((m) => {
            const styles = getTypeStyles(m.memory_type)
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMemory(m)}
                className="glass-card rounded-2xl p-4 border border-white/60 hover:bg-white/80 transition-all duration-200 cursor-pointer shadow-3xs group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${styles.bg}`}>
                      {m.memory_type}
                    </span>
                    <span className="text-[10px] text-charcoal/40 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <p className="text-xs font-semibold text-charcoal leading-relaxed mb-3 pr-2">
                    {m.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-charcoal/5">
                  <div className="flex gap-4 text-[10px] text-charcoal/50">
                    <div>
                      <span>Confidence: </span>
                      <span className="font-bold text-primary-dark">{formatPercentage(m.confidence)}</span>
                    </div>
                    <div>
                      <span>Importance: </span>
                      <span className="font-bold text-secondary-dark">{formatPercentage(m.importance)}</span>
                    </div>
                  </div>
                  <div className="text-2xs bg-white/90 border border-charcoal/5 px-2 py-0.5 rounded-lg text-charcoal/60 font-medium">
                    {m.evidence_refs.length} source{m.evidence_refs.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Memory Evidence Roots Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-cream border-2 border-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-float">
            
            <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 mb-4">
              <div className="flex items-center gap-2 text-secondary-dark">
                <Brain className="w-5 h-5" />
                <h3 className="font-display font-bold text-base text-charcoal">
                  Memory Evidence Roots
                </h3>
              </div>
              <button 
                onClick={() => setSelectedMemory(null)}
                className="p-1 rounded-lg text-charcoal/50 hover:bg-charcoal/5 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Memory Category</span>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg border ${getTypeStyles(selectedMemory.memory_type).bg}`}>
                  {selectedMemory.memory_type}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Distilled Memory Summary</span>
                <p className="text-xs font-bold text-charcoal bg-white/70 border border-white border-b-2 p-3.5 rounded-2xl mt-1 leading-relaxed shadow-3xs">
                  "{selectedMemory.summary}"
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center bg-white/40 border border-white/60 p-3 rounded-2xl">
                <div>
                  <span className="text-[9px] uppercase font-bold text-charcoal/40 tracking-wider block">Confidence</span>
                  <span className="text-xs font-extrabold text-primary-dark mt-0.5 block">{formatPercentage(selectedMemory.confidence)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-charcoal/40 tracking-wider block">Importance</span>
                  <span className="text-xs font-extrabold text-secondary-dark mt-0.5 block">{formatPercentage(selectedMemory.importance)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-charcoal/40 tracking-wider block">Relevance</span>
                  <span className="text-xs font-extrabold text-yellow-dark mt-0.5 block">{formatPercentage(selectedMemory.relevance_score)}</span>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Factual Trace References
                </span>
                {selectedMemory.evidence_refs.map((ref, idx) => (
                  <div key={idx} className="bg-white/60 border border-white p-2.5 rounded-xl text-[10px] text-charcoal/70 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="capitalize">Source: {ref.source_type}</span>
                      <span>{new Date(ref.timestamp).toLocaleDateString()}</span>
                    </div>
                    {ref.context && (
                      <p className="text-[9px] text-charcoal/50 leading-relaxed italic">
                        "{ref.context}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedMemory(null)}
                className="py-2 px-5 btn-clay-secondary text-xs cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
