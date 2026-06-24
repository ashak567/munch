'use client'

import React, { useState, useEffect } from 'react'
import { Sparkles, ThumbsUp, ThumbsDown, Heart, Shield, RefreshCw } from 'lucide-react'

interface NicknameAffinity {
  id: string
  nickname: string
  times_used: number
  comfort_score: number
  user_reaction: 'love' | 'okay' | 'dislike' | null
  is_active: boolean
  last_used_at: string
}

interface RelationshipState {
  level: 'new' | 'familiar' | 'trusted' | 'close'
  score: number
  decisionsCount: number
  memoriesCount: number
  activeDays: number
  returnVisits: number
}

interface NicknamePanelProps {
  userId: string
}

export default function NicknamePanel({ userId }: NicknamePanelProps) {
  const [affinities, setAffinities] = useState<NicknameAffinity[]>([])
  const [relationship, setRelationship] = useState<RelationshipState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingNickname, setUpdatingNickname] = useState<string | null>(null)

  const fetchNicknames = async () => {
    try {
      const res = await fetch('/api/nicknames')
      if (!res.ok) {
        throw new Error('Failed to retrieve nickname configurations.')
      }
      const data = await res.json()
      setAffinities(data.affinities || [])
      setRelationship(data.relationship || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNicknames()
  }, [userId])

  const handleReact = async (nickname: string, reaction: 'love' | 'okay' | 'dislike') => {
    setUpdatingNickname(nickname)
    try {
      const res = await fetch('/api/nicknames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nickname, reaction })
      })

      if (res.ok) {
        // Refresh nicknames list
        await fetchNicknames()
      } else {
        console.error('Failed to submit nickname reaction.')
      }
    } catch (err) {
      console.error('Nickname reaction error:', err)
    } finally {
      setUpdatingNickname(null)
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <div className="animate-spin text-4xl mb-3">🍀</div>
        <p className="text-sm text-charcoal/60">Opening nickname journal...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl p-6 text-center text-coral-dark bg-coral/10 border border-coral-dark/10 my-4">
        <p className="font-semibold text-sm">Failed to load journal: {error}</p>
      </div>
    )
  }

  const activeNicknameRecord = affinities.find(a => a.is_active)
  const activeNickname = activeNicknameRecord ? activeNicknameRecord.nickname : 'friend'

  const relationshipTitle: Record<string, string> = {
    new: 'New Companion',
    familiar: 'Familiar Friend',
    trusted: 'Trusted Companion',
    close: 'Close Companion'
  }

  return (
    <div className="space-y-6 max-w-md mx-auto text-left">
      {/* Journal Information Banner */}
      <div className="bg-cream border border-charcoal/5 rounded-3xl p-5 relative overflow-hidden bg-white/60">
        <div className="flex gap-3 items-start">
          <div className="p-2 bg-primary/20 text-primary-dark rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-charcoal">Dynamic Nickname Journal</h3>
            <p className="text-2xs text-charcoal/70 leading-relaxed mt-1">
              Munch calls you warm nicknames based strictly on your verified beliefs and memories. Address yourself in your choices, and Munch will learn which names bring you the most comfort.
            </p>
          </div>
        </div>
      </div>

      {/* Relationship Level Card */}
      {relationship && (
        <div className="bg-white/50 border border-charcoal/5 rounded-3xl p-5 space-y-4">
          <div>
            <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-wider block">Relationship Status</span>
            <h4 className="font-display font-black text-lg text-charcoal mt-0.5">
              {relationshipTitle[relationship.level] || 'Friend'}
            </h4>
            <p className="text-2xs text-charcoal/60 leading-normal mt-1">
              Familiarity builds as you share decisions, create memories, and check in.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-3xs border-t border-charcoal/5">
            <div className="bg-white/40 p-2.5 rounded-2xl border border-charcoal/5">
              <span className="text-charcoal/40 font-bold block">Familiarity Score</span>
              <span className="font-display font-bold text-sm text-charcoal mt-1 block">{relationship.score} pts</span>
            </div>
            <div className="bg-white/40 p-2.5 rounded-2xl border border-charcoal/5">
              <span className="text-charcoal/40 font-bold block">Current Nickname</span>
              <span className="font-display font-bold text-sm text-primary-dark mt-1 block capitalize">{activeNickname}</span>
            </div>
          </div>
        </div>
      )}

      {/* Nicknames List */}
      <div className="space-y-3">
        <h4 className="font-display font-bold text-xs text-charcoal/50 uppercase tracking-wider pl-1">
          Nickname Comfort Ratings
        </h4>

        {affinities.length === 0 ? (
          <div className="text-center py-6 text-2xs text-charcoal/40">
            No nickname candidates have been generated yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {affinities.map((aff) => {
              const isUpdating = updatingNickname === aff.nickname
              return (
                <div
                  key={aff.id}
                  className={`bg-white/70 border rounded-2xl p-4 flex items-center justify-between transition-all ${
                    aff.is_active
                      ? 'border-primary/30 shadow-sm bg-primary-light/10'
                      : 'border-charcoal/5'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-bold text-sm text-charcoal capitalize">
                        {aff.nickname}
                      </span>
                      {aff.is_active && (
                        <span className="bg-primary/20 text-primary-dark text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-3xs text-charcoal/40">
                      <span>Used: {aff.times_used} times</span>
                      <span>•</span>
                      <span>Comfort: {Number(aff.comfort_score).toFixed(1)}/10</span>
                    </div>
                  </div>

                  {/* Reaction Button Panel */}
                  <div className="flex gap-1.5 items-center">
                    {/* Love */}
                    <button
                      onClick={() => handleReact(aff.nickname, 'love')}
                      disabled={isUpdating}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        aff.user_reaction === 'love'
                          ? 'bg-primary/20 border-primary/20 text-primary-dark font-bold'
                          : 'bg-white/40 border-charcoal/5 text-charcoal/40 hover:text-charcoal'
                      }`}
                      title="Love this nickname"
                    >
                      <Heart className={`w-3.5 h-3.5 ${aff.user_reaction === 'love' ? 'fill-primary-dark' : ''}`} />
                    </button>

                    {/* Okay */}
                    <button
                      onClick={() => handleReact(aff.nickname, 'okay')}
                      disabled={isUpdating}
                      className={`p-1.5 rounded-lg border text-3xs font-semibold transition-all cursor-pointer ${
                        aff.user_reaction === 'okay'
                          ? 'bg-secondary/20 border-secondary/20 text-secondary-dark'
                          : 'bg-white/40 border-charcoal/5 text-charcoal/40 hover:text-charcoal'
                      }`}
                      title="This is okay"
                    >
                      😐
                    </button>

                    {/* Dislike */}
                    <button
                      onClick={() => handleReact(aff.nickname, 'dislike')}
                      disabled={isUpdating}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        aff.user_reaction === 'dislike'
                          ? 'bg-coral/20 border-coral/20 text-coral-dark'
                          : 'bg-white/40 border-charcoal/5 text-charcoal/40 hover:text-coral-dark'
                      }`}
                      title="Don't use this nickname"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
