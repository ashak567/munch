'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { logout } from '@/app/auth/actions'
import { LogOut, Mail, ShieldAlert, Award, Edit3, Save, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import HUPSPanel from './HUPSPanel'
import MemoryPanel from './MemoryPanel'

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'hups' | 'memory'>('profile')

  // Stats and editing states
  const [stats, setStats] = useState({ totalDecisions: 0, favoriteCategory: 'None yet' })
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        setEditName(user.user_metadata?.full_name || user.email?.split('@')[0] || '')
      }

      try {
        const res = await fetch('/api/preferences')
        if (res.ok) {
          const statsData = await res.json()
          let favorite = 'None yet'
          let maxCount = 0
          if (statsData.categoryDistribution) {
            Object.entries(statsData.categoryDistribution).forEach(([cat, count]) => {
              if ((count as number) > maxCount) {
                maxCount = count as number
                favorite = cat
              }
            })
          }
          setStats({
            totalDecisions: statsData.totalDecisions || 0,
            favoriteCategory: favorite
          })
        }
      } catch (err) {
        console.error('Failed to load stats', err)
      }

      setLoading(false)
    }
    loadProfile()
  }, [])

  const handleSaveName = async () => {
    if (!editName.trim()) return
    setUpdating(true)
    setFeedbackMsg(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: editName.trim() }
      })
      if (error) throw error
      setUser(data.user)
      setIsEditing(false)
      setFeedbackMsg('Name updated successfully!')
      setTimeout(() => setFeedbackMsg(null), 3000)
    } catch (err: unknown) {
      console.error(err)
      setFeedbackMsg(err instanceof Error ? err.message : 'Failed to update name')
    } finally {
      setUpdating(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } catch (err) {
      console.error('Failed to log out', err)
      setLoggingOut(false)
      setShowConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center h-64">
        <div className="animate-spin text-3xl">🍀</div>
      </div>
    )
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userInitial = userName.charAt(0).toUpperCase()
  const userEmail = user?.email || ''

  return (
    <div className="flex-grow flex flex-col py-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold text-charcoal">
          Your Profile
        </h1>
        <p className="text-sm text-charcoal/60 mt-1">
          Manage your account and cognitive profile.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/40 p-1 rounded-2xl border border-white/50 w-full max-w-md">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-white text-charcoal shadow-sm border border-charcoal/5'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('hups')}
          className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
            activeTab === 'hups'
              ? 'bg-white text-charcoal shadow-sm border border-charcoal/5'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          Understanding
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
            activeTab === 'memory'
              ? 'bg-white text-charcoal shadow-sm border border-charcoal/5'
              : 'text-charcoal/60 hover:text-charcoal'
          }`}
        >
          Memory Lane
        </button>
      </div>

      {activeTab === 'profile' ? (
        <>
          {/* Profile Details Card */}
          <div className="glass-panel rounded-3xl p-6 shadow-xl mb-6 flex flex-col items-center text-center">
        {/* Large Avatar */}
        <div className="w-24 h-24 rounded-full bg-secondary text-secondary-dark flex items-center justify-center font-bold text-3xl border-4 border-white shadow-md mb-4 relative">
          {userInitial}
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-dark p-1.5 rounded-full border-2 border-white shadow-sm">
            <Award className="w-4 h-4" />
          </div>
        </div>

        {/* Editable Name Field */}
        <div className="w-full max-w-xs mb-1">
          {isEditing ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
                disabled={updating}
                className="flex-grow px-3 py-1.5 border border-charcoal/20 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-primary/40 text-center text-sm font-semibold text-charcoal"
              />
              <button
                onClick={handleSaveName}
                disabled={updating || !editName.trim()}
                className="p-2 bg-primary hover:bg-primary-dark text-primary-dark border border-primary-dark/30 rounded-xl cursor-pointer disabled:opacity-50"
                title="Save name"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditName(userName)
                  setIsEditing(false)
                }}
                disabled={updating}
                className="p-2 bg-white/80 hover:bg-charcoal/5 border border-charcoal/10 text-charcoal/70 rounded-xl cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-2 group">
              <h2 className="font-display text-2xl font-bold text-charcoal">
                {userName}
              </h2>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 rounded-lg text-charcoal/40 hover:text-charcoal hover:bg-charcoal/5 transition-colors cursor-pointer"
                title="Edit name"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-charcoal/60 mb-6 justify-center">
          <Mail className="w-3.5 h-3.5" />
          <span>{userEmail}</span>
        </div>

        {feedbackMsg && (
          <div className={`text-2xs font-bold px-3 py-1.5 rounded-xl mb-4 border ${
            feedbackMsg.includes('failed') || feedbackMsg.includes('Failed')
              ? 'bg-coral/10 border-coral-dark/20 text-coral-dark'
              : 'bg-primary/20 border-primary-dark/20 text-primary-dark'
          }`}>
            {feedbackMsg}
          </div>
        )}

        {/* Action Buttons */}
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-3 px-6 btn-clay-secondary text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>

          {/* Preferences / Account Info */}
          <div className="glass-card rounded-2xl p-5 border border-white/50 text-xs text-charcoal/70 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-charcoal/10 font-bold text-charcoal">
              <span>ACCOUNT STATS</span>
            </div>
            <div className="flex justify-between">
              <span>Decisions made</span>
              <span className="font-bold text-charcoal">{stats.totalDecisions}</span>
            </div>
            <div className="flex justify-between">
              <span>Favorite Category</span>
              <span className="font-bold text-charcoal capitalize">{stats.favoriteCategory}</span>
            </div>
            <div className="flex justify-between">
              <span>Member since</span>
              <span className="font-bold text-charcoal">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Today'}
              </span>
            </div>
          </div>
        </>
      ) : activeTab === 'hups' ? (
        <HUPSPanel userId={user?.id || ''} />
      ) : (
        <MemoryPanel userId={user?.id || ''} />
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-cream border-2 border-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-float">
            <div className="flex items-center gap-3 mb-4 text-secondary-dark">
              <div className="p-2 bg-secondary/30 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-charcoal">
                Confirm Log Out
              </h3>
            </div>
            <p className="text-xs text-charcoal/70 leading-relaxed mb-6">
              Are you sure you want to log out? Your decisions are safe, and Munch will be waiting here for your next choice!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={loggingOut}
                className="flex-1 py-2.5 border-2 border-charcoal/10 rounded-2xl bg-white hover:bg-charcoal/5 font-semibold text-xs text-charcoal cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 py-2.5 btn-clay-secondary text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {loggingOut ? 'Logging Out...' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
