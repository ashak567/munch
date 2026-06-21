'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { logout } from '@/app/auth/actions'
import { LogOut, User, Mail, ShieldAlert, Award } from 'lucide-react'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    loadUser()
  }, [])

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
          Manage your account and preferences.
        </p>
      </div>

      {/* Profile Details Card */}
      <div className="glass-panel rounded-3xl p-6 shadow-xl mb-6 flex flex-col items-center text-center">
        {/* Large Avatar */}
        <div className="w-24 h-24 rounded-full bg-secondary text-secondary-dark flex items-center justify-center font-bold text-3xl border-4 border-white shadow-md mb-4 relative">
          {userInitial}
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-dark p-1.5 rounded-full border-2 border-white shadow-sm">
            <Award className="w-4 h-4" />
          </div>
        </div>

        <h2 className="font-display text-2xl font-bold text-charcoal mb-1">
          {userName}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-charcoal/60 mb-6 justify-center">
          <Mail className="w-3.5 h-3.5" />
          <span>{userEmail}</span>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full py-3 px-6 btn-clay-secondary text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>

      {/* Preferences Placeholder / Account Info */}
      <div className="glass-card rounded-2xl p-5 border border-white/50 text-xs text-charcoal/70 space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-charcoal/10 font-bold text-charcoal">
          <span>ACCOUNT STATS</span>
        </div>
        <div className="flex justify-between">
          <span>Decisions made</span>
          <span className="font-bold text-charcoal">0</span>
        </div>
        <div className="flex justify-between">
          <span>Favorite Category</span>
          <span className="font-bold text-charcoal">None yet</span>
        </div>
        <div className="flex justify-between">
          <span>Member since</span>
          <span className="font-bold text-charcoal">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Today'}
          </span>
        </div>
      </div>

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
