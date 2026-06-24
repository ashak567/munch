'use client'

import React, { useState, useEffect } from 'react'
import { 
  Heart, Sparkles, User, MessageSquare, HelpCircle, 
  Activity, TrendingUp, Map, BookOpen, Shield, Clock, Info
} from 'lucide-react'

interface HUPSPanelProps {
  userId: string
}

interface BeliefRow {
  id: string
  dimension: string
  key: string
  value: any
  confidence: number
  evidence_count: number
  evidence_refs: Array<{
    observation_id: string
    source_type: string
    timestamp: string
  }>
}

export default function HUPSPanel({ userId }: HUPSPanelProps) {
  const [beliefs, setBeliefs] = useState<BeliefRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBelief, setSelectedBelief] = useState<BeliefRow | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/profile')
        if (!res.ok) {
          throw new Error('Failed to load cognitive profile')
        }
        const data = await res.json()
        setBeliefs(data.beliefs || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [userId])

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="animate-spin text-4xl mb-3">🍀</div>
        <p className="text-sm text-charcoal/60">Sensing your thoughts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel rounded-3xl p-6 text-center text-coral-dark bg-coral/10 border border-coral-dark/20 my-4">
        <p className="font-semibold text-sm">Failed to retrieve profile: {error}</p>
      </div>
    )
  }

  // Filter beliefs by dimensions
  const getBeliefsByDimension = (dim: string) => beliefs.filter(b => b.dimension === dim)

  const identityBeliefs = getBeliefsByDimension('identity')
  const relationshipBeliefs = getBeliefsByDimension('relationship')
  const valuesBeliefs = getBeliefsByDimension('values')
  const commBeliefs = getBeliefsByDimension('communication')
  const decisionBeliefs = getBeliefsByDimension('decision_pattern')
  const comfortBeliefs = getBeliefsByDimension('comfort')
  const interestBeliefs = getBeliefsByDimension('interests')
  const emotionalBeliefs = getBeliefsByDimension('emotional_pattern')
  const narrativeBeliefs = getBeliefsByDimension('narrative')
  const growthBeliefs = getBeliefsByDimension('growth')
  const uncertaintyBeliefs = getBeliefsByDimension('uncertainty')

  // Relationship Stage Resolver
  const relStageBelief = relationshipBeliefs.find(b => b.key === 'relationship_stage') || relationshipBeliefs.find(b => b.key === 'stage')
  const relStage = relStageBelief ? String(relStageBelief.value) : 'new'

  const stageLabels: Record<string, string> = {
    'new': 'New Companion',
    'familiar': 'Familiar Friend',
    'comfortable': 'Comfortable Presence',
    'trusted': 'Trusted Ally',
    'long-term companion': 'Long-term Companion'
  }

  const stageDescriptions: Record<string, string> = {
    'new': "We are just getting started. I am eager to listen and observe your patterns slowly.",
    'familiar': "We've shared some moments. Your decisions are beginning to outline a recognizable rhythm.",
    'comfortable': "We share a cozy space. You can speak open-heartedly; I understand your primary comforts.",
    'trusted': "A deep bond has grown. I hold a strong awareness of what matters most to your peace of mind.",
    'long-term companion': "A lasting friendship. I understand you like a close companion, adapting alongside your changes."
  }

  // Format Helper for confidence
  const formatConfidence = (conf: number) => `${Math.round(conf * 100)}%`

  return (
    <div className="space-y-6">
      {/* Top Banner: Relationship Status (Layer 1 philosophy) */}
      <div className="glass-panel rounded-3xl p-6 shadow-xl border border-white/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/20 rounded-full blur-2xl -z-10" />
        
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-primary/20 text-primary-dark rounded-2xl border-2 border-white shadow-sm flex-shrink-0 animate-float">
            <Heart className="w-6 h-6 fill-primary-dark/30" />
          </div>
          <div>
            <div className="text-2xs font-extrabold text-primary-dark uppercase tracking-widest mb-1">Our Connection</div>
            <h2 className="font-display text-xl font-bold text-charcoal capitalize">
              {stageLabels[relStage.toLowerCase()] || relStage}
            </h2>
            <p className="text-xs text-charcoal/70 leading-relaxed mt-1">
              {stageDescriptions[relStage.toLowerCase()] || "A warm path of dynamic mutual understanding is forming."}
            </p>
          </div>
        </div>
      </div>

      {/* Narrative Section (Live story you are living) */}
      {narrativeBeliefs.length > 0 && (
        <div className="glass-panel rounded-3xl p-5 border border-white/60">
          <div className="flex items-center gap-2 mb-3 text-secondary-dark">
            <Map className="w-4 h-4" />
            <span className="font-display font-bold text-sm text-charcoal">Your Active Narrative</span>
          </div>
          <div className="space-y-3">
            {narrativeBeliefs.map((nb, i) => (
              <div 
                key={nb.id || i}
                onClick={() => setSelectedBelief(nb)}
                className="bg-white/50 hover:bg-white/80 border border-white/80 p-4 rounded-2xl cursor-pointer transition-all duration-200 shadow-2xs flex justify-between items-center group"
              >
                <div className="flex-grow pr-3">
                  <p className="text-xs font-semibold text-charcoal italic leading-relaxed">
                    "{String(nb.value)}"
                  </p>
                  <span className="text-[10px] text-charcoal/50 mt-1 block">
                    Observed in {nb.evidence_count} interaction{nb.evidence_count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-2xs bg-secondary/20 text-secondary-dark font-bold px-2 py-1 rounded-lg flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="w-3 h-3" />
                  <span>{formatConfidence(nb.confidence)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-Column Dimensions layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core Values */}
        <div className="glass-panel rounded-3xl p-5 border border-white/60">
          <div className="flex items-center gap-2 mb-4 text-primary-dark">
            <Shield className="w-4 h-4" />
            <h3 className="font-display font-bold text-sm text-charcoal">Core Values Inferred</h3>
          </div>
          {valuesBeliefs.length === 0 ? (
            <p className="text-2xs text-charcoal/50 leading-relaxed italic">
              No values have been observed yet. I will learn them gradually from your choices.
            </p>
          ) : (
            <div className="space-y-3">
              {valuesBeliefs.map((vb) => (
                <div 
                  key={vb.key}
                  onClick={() => setSelectedBelief(vb)}
                  className="bg-white/40 hover:bg-white/70 border border-white/50 p-3.5 rounded-2xl cursor-pointer transition-all duration-200 shadow-3xs"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-charcoal capitalize">{vb.key}</span>
                    <span className="text-2xs text-charcoal/50 font-bold bg-white/70 px-2 py-0.5 rounded-lg border border-charcoal/5">
                      {vb.evidence_count} proof
                    </span>
                  </div>
                  <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden border border-white/40 relative">
                    <div 
                      className="bg-gradient-to-r from-primary/80 to-primary-dark/90 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${vb.confidence * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-charcoal/50 mt-1">
                    <span>Confidence</span>
                    <span className="font-semibold text-primary-dark">{formatConfidence(vb.confidence)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decision & Communication styles */}
        <div className="glass-panel rounded-3xl p-5 border border-white/60 space-y-6">
          
          {/* Decision Pattern */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-yellow/90">
              <Activity className="w-4 h-4" />
              <h3 className="font-display font-bold text-sm text-charcoal">Decision-making Style</h3>
            </div>
            {decisionBeliefs.length === 0 ? (
              <p className="text-2xs text-charcoal/50 italic leading-relaxed">
                Awaiting more decisions to observe your decision habits.
              </p>
            ) : (
              <div className="space-y-2.5">
                {decisionBeliefs.map((db) => {
                  const prob = typeof db.value === 'number' ? db.value : Number(db.value) || db.confidence
                  return (
                    <div 
                      key={db.key}
                      onClick={() => setSelectedBelief(db)}
                      className="cursor-pointer group"
                    >
                      <div className="flex justify-between text-[11px] font-medium text-charcoal/80 mb-0.5 group-hover:text-charcoal transition-colors">
                        <span className="capitalize">{db.key.replace('_', ' ')}</span>
                        <span>{Math.round(prob * 100)}%</span>
                      </div>
                      <div className="w-full bg-white/40 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-yellow h-full rounded-full transition-all duration-500" 
                          style={{ width: `${prob * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Communication Style */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-secondary-dark">
              <MessageSquare className="w-4 h-4" />
              <h3 className="font-display font-bold text-sm text-charcoal">Communication Style</h3>
            </div>
            {commBeliefs.length === 0 ? (
              <p className="text-2xs text-charcoal/50 italic leading-relaxed">
                Observing your interactions to sense your preferred tone.
              </p>
            ) : (
              <div className="space-y-2.5">
                {commBeliefs.map((cb) => {
                  const prob = typeof cb.value === 'number' ? cb.value : Number(cb.value) || cb.confidence
                  return (
                    <div 
                      key={cb.key}
                      onClick={() => setSelectedBelief(cb)}
                      className="cursor-pointer group"
                    >
                      <div className="flex justify-between text-[11px] font-medium text-charcoal/80 mb-0.5 group-hover:text-charcoal transition-colors">
                        <span className="capitalize">{cb.key}</span>
                        <span>{Math.round(prob * 100)}%</span>
                      </div>
                      <div className="w-full bg-white/40 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-secondary h-full rounded-full transition-all duration-500" 
                          style={{ width: `${prob * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Comfort Dimension (What supports you) & Emotional Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Comfort Preferences */}
        <div className="glass-panel rounded-3xl p-5 border border-white/60">
          <div className="flex items-center gap-2 mb-4 text-coral-dark">
            <BookOpen className="w-4 h-4" />
            <h3 className="font-display font-bold text-sm text-charcoal">Cozy Support Preferences</h3>
          </div>
          {comfortBeliefs.length === 0 ? (
            <p className="text-2xs text-charcoal/50 italic leading-relaxed">
              I am learning what helps you feel most supported when deciding.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {comfortBeliefs.map((cb) => (
                <div 
                  key={cb.key}
                  onClick={() => setSelectedBelief(cb)}
                  className="chip-clay px-3.5 py-2 rounded-2xl flex items-center gap-2 cursor-pointer text-xs font-semibold text-charcoal bg-white"
                >
                  <span className="capitalize">{cb.key}</span>
                  <span className="text-[10px] text-coral-dark font-bold bg-coral/20 px-1.5 py-0.5 rounded-lg border border-coral/15">
                    {formatConfidence(cb.confidence)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emotional Patterns & Growth */}
        <div className="glass-panel rounded-3xl p-5 border border-white/60 space-y-4">
          <div className="flex items-center gap-2 mb-1 text-primary-dark">
            <TrendingUp className="w-4 h-4" />
            <h3 className="font-display font-bold text-sm text-charcoal">Observations & Evolving Growth</h3>
          </div>
          
          {/* Emotional patterns list */}
          {emotionalBeliefs.length > 0 && (
            <div className="space-y-2 pb-2 border-b border-charcoal/5">
              <span className="text-3xs uppercase tracking-wider font-extrabold text-charcoal/40 block">Emotional Rhythms</span>
              {emotionalBeliefs.map((eb, i) => (
                <div 
                  key={eb.id || i}
                  onClick={() => setSelectedBelief(eb)}
                  className="bg-white/30 border border-white/60 p-2.5 rounded-xl cursor-pointer text-[11px] leading-relaxed text-charcoal/80 flex items-start gap-2 hover:bg-white/60 transition-colors"
                >
                  <span className="text-primary-dark">🌱</span>
                  <span>{typeof eb.value === 'string' ? eb.value : eb.value?.pattern || String(eb.key).replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Growth dimension */}
          {growthBeliefs.length > 0 ? (
            <div className="space-y-2">
              <span className="text-3xs uppercase tracking-wider font-extrabold text-charcoal/40 block">Growth Steps</span>
              {growthBeliefs.map((gb, i) => (
                <div 
                  key={gb.id || i}
                  onClick={() => setSelectedBelief(gb)}
                  className="bg-white/30 border border-white/60 p-2.5 rounded-xl cursor-pointer text-[11px] leading-relaxed text-charcoal/80 flex items-start gap-2 hover:bg-white/60 transition-colors"
                >
                  <span className="text-secondary-dark">✨</span>
                  <span>{typeof gb.value === 'string' ? gb.value : gb.value?.description || String(gb.key).replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-2xs text-charcoal/50 italic leading-relaxed pt-2">
              No long-term growth trends tracked yet. We evolve together.
            </p>
          )}

        </div>
      </div>

      {/* Uncertainty Dimension (Curiosity) */}
      <div className="glass-panel rounded-3xl p-5 border border-white/60">
        <div className="flex items-center gap-2 mb-3 text-charcoal/60">
          <HelpCircle className="w-4 h-4" />
          <h3 className="font-display font-bold text-sm text-charcoal">Munch's Curiosities</h3>
        </div>
        <p className="text-2xs text-charcoal/60 leading-relaxed mb-4">
          To understand a person means to know what we do not know. Here are the areas I am currently curious to learn more about from our future decisions:
        </p>
        {uncertaintyBeliefs.length === 0 ? (
          <div className="bg-white/40 border border-white/50 p-4 rounded-2xl text-center">
            <span className="text-2xs text-charcoal/50 italic">Currently matching all active dimensions against evidence.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {uncertaintyBeliefs.map((ub) => (
              <div 
                key={ub.key}
                onClick={() => setSelectedBelief(ub)}
                className="bg-cream border border-charcoal/10 px-3 py-1.5 rounded-xl text-2xs font-medium text-charcoal/70 cursor-pointer flex items-center gap-1.5 hover:bg-white transition-colors"
              >
                <span>🔍</span>
                <span className="capitalize">{ub.key.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence Root Modal (Factual backing validation) */}
      {selectedBelief && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-cream border-2 border-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-float">
            
            <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 mb-4">
              <div className="flex items-center gap-2 text-primary-dark">
                <Shield className="w-5 h-5" />
                <h3 className="font-display font-bold text-base text-charcoal capitalize">
                  Evidence Roots
                </h3>
              </div>
              <button 
                onClick={() => setSelectedBelief(null)}
                className="p-1 rounded-lg text-charcoal/50 hover:bg-charcoal/5 cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Dimension & Attribute</span>
                <p className="text-xs font-semibold text-charcoal mt-0.5 capitalize">
                  {selectedBelief.dimension.replace('_', ' ')}: <span className="font-bold text-primary-dark">{selectedBelief.key.replace('_', ' ')}</span>
                </p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Current Synthesized Belief</span>
                <p className="text-xs font-bold text-charcoal bg-white/70 border border-white border-b-2 p-3 rounded-2xl mt-1 leading-relaxed shadow-3xs">
                  {typeof selectedBelief.value === 'object' 
                    ? JSON.stringify(selectedBelief.value) 
                    : String(selectedBelief.value)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white/40 border border-white/60 p-3 rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Confidence Level</span>
                  <p className="text-sm font-extrabold text-primary-dark mt-0.5">{formatConfidence(selectedBelief.confidence)}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">Proof Count</span>
                  <p className="text-sm font-extrabold text-charcoal mt-0.5">{selectedBelief.evidence_count} observations</p>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Historical References
                </span>
                {selectedBelief.evidence_refs.map((ref, idx) => (
                  <div key={ref.observation_id || idx} className="bg-white/60 border border-white p-2.5 rounded-xl text-[10px] flex justify-between items-center text-charcoal/70">
                    <span className="capitalize">Source: {ref.source_type}</span>
                    <span>{new Date(ref.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBelief(null)}
                className="py-2 px-5 btn-clay-primary text-xs cursor-pointer"
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
