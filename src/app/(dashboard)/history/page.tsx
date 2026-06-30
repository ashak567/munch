'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Trash2, 
  Edit3, 
  Save, 
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import Mascot, { MascotCharacter } from '@/components/Mascot'
import { createClient } from '@/utils/supabase/client'

interface JournalEntry {
  id: string
  title: string
  content: string
  reflection: string | null
  created_at: string
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  
  // Writing Form States
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Preferred Mascot for visual reflection
  const [preferredMascot, setPreferredMascot] = useState<MascotCharacter>('munch')

  // Load entries on mount
  const fetchEntries = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/journal')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        if (data.entries?.length > 0) {
          setSelectedEntry(data.entries[0])
        }
      }
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('preferred_mascot')
          .eq('id', user.id)
          .maybeSingle()
        if (profile?.preferred_mascot) {
          setPreferredMascot(profile.preferred_mascot as MascotCharacter)
        }
      }
    } catch (err) {
      console.error('[Journal] Fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  // Create or Update
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || saving) return

    setSaving(true)
    setError(null)

    try {
      if (isEditing && editId) {
        // Update
        const res = await fetch(`/api/journal/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content })
        })
        if (res.ok) {
          const data = await res.json()
          setEntries(prev => prev.map(item => item.id === editId ? data.entry : item))
          setSelectedEntry(data.entry)
          handleCancelEdit()
        } else {
          throw new Error('Failed to update entry')
        }
      } else {
        // Create
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content })
        })
        if (res.ok) {
          const data = await res.json()
          setEntries(prev => [data.entry, ...prev])
          setSelectedEntry(data.entry)
          handleCancelEdit()
        } else {
          throw new Error('Failed to save entry')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  // Delete
  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmDelete = window.confirm("Are you sure you want to delete this page from your notebook?")
    if (!confirmDelete) return

    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setEntries(prev => prev.filter(item => item.id !== id))
        if (selectedEntry?.id === id) {
          setSelectedEntry(entries.find(item => item.id !== id) || null)
        }
      }
    } catch (err) {
      console.error('[Journal] Delete failed:', err)
    }
  }

  const handleStartEdit = (entry: JournalEntry) => {
    setIsEditing(true)
    setEditId(entry.id)
    setTitle(entry.title)
    setContent(entry.content)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditId(null)
    setTitle('')
    setContent('')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex-grow flex flex-col h-[100dvh] relative overflow-hidden px-4 md:px-6 py-6 select-none max-w-5xl mx-auto">
      {/* Header Title */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-white/40 pb-4 mb-4">
        <div>
          <h2 className="font-display font-black text-2xl text-charcoal">
            Private Notebook Journal
          </h2>
          <p className="text-2xs text-charcoal/50 font-bold uppercase tracking-wider block mt-1">
            Write down your thoughts. Let them settle naturally in your space.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setIsEditing(true)
              setEditId(null)
              setTitle('')
              setContent('')
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-primary-dark font-display font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-primary-dark/30"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Write New Page</span>
          </button>
        )}
      </div>

      {/* Main Ruled Notebook Split View */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden pb-4">
        
        {/* Left Side: Rule-lined Notepad Writing/Viewing Screen */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#FBF9F5] border border-charcoal/10 rounded-3xl shadow-xl overflow-hidden relative">
          {/* Notebook Red Margin Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-red-400/35 pointer-events-none z-10" />

          {isEditing ? (
            /* Editing Notepad Form */
            <form onSubmit={handleSaveEntry} className="flex-grow flex flex-col p-6 pl-12 min-h-0">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 100))}
                placeholder="Page Title (e.g. My thoughts today)"
                required
                className="w-full text-base font-display font-black bg-transparent border-b border-charcoal/10 pb-2 focus:outline-none focus:border-primary text-charcoal placeholder-charcoal/30 flex-shrink-0 mb-4"
              />

              {/* Ruled lines text area */}
              <div className="flex-grow relative min-h-0">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write whatever is on your mind... Let your thoughts flow."
                  required
                  className="w-full h-full bg-transparent border-none outline-none resize-none font-serif text-sm leading-[28px] text-charcoal/90 placeholder-charcoal/30"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(74,74,74,0.06) 1px, transparent 1px)',
                    backgroundSize: '100% 28px',
                    lineHeight: '28px',
                    paddingTop: '2px'
                  }}
                />
              </div>

              {error && <p className="text-2xs text-red-500 font-bold mt-2">{error}</p>}

              {/* Form Controls */}
              <div className="flex items-center gap-3 border-t border-charcoal/5 pt-4 mt-2 flex-shrink-0">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-primary-dark text-white font-display font-bold text-xs rounded-xl shadow-md hover:bg-primary transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Reflecting...' : 'Save & Reflect'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-white border border-charcoal/10 text-charcoal/60 font-display font-bold text-xs rounded-xl hover:bg-cream transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : selectedEntry ? (
            /* View Page Mode */
            <div className="flex-grow flex flex-col p-6 pl-12 min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-charcoal/10 pb-3 mb-4 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-display font-black text-charcoal leading-tight">
                    {selectedEntry.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-3xs font-bold text-charcoal/40 uppercase mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(selectedEntry.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleStartEdit(selectedEntry)}
                    className="p-2 bg-white hover:bg-cream border border-charcoal/10 rounded-xl text-charcoal/60 hover:text-charcoal transition-all shadow-3xs cursor-pointer"
                    title="Edit entry"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteEntry(selectedEntry.id, e)}
                    className="p-2 bg-white hover:bg-red-50 border border-charcoal/10 rounded-xl text-charcoal/40 hover:text-red-500 transition-all shadow-3xs cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Lined content body */}
              <div 
                className="flex-grow font-serif text-sm leading-[28px] text-charcoal/80 whitespace-pre-line pb-6"
                style={{
                  backgroundImage: 'linear-gradient(rgba(74,74,74,0.06) 1px, transparent 1px)',
                  backgroundSize: '100% 28px',
                  lineHeight: '28px',
                  paddingTop: '2px'
                }}
              >
                {selectedEntry.content}
              </div>

              {/* Warm Companion Reflection Panel */}
              {selectedEntry.reflection && (
                <div className="mt-4 border-t border-charcoal/10 pt-4 flex-shrink-0">
                  <div className="bg-[#FAF4EF] border border-[#ECD9CE] rounded-2xl p-4 flex gap-3.5 items-start relative overflow-hidden shadow-2xs">
                    <div className="flex-shrink-0 pt-0.5">
                      <Mascot character={preferredMascot} expression="listening" size="sm" className="drop-shadow-sm" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#A26D53] block mb-1">
                        {preferredMascot.charAt(0).toUpperCase() + preferredMascot.slice(1)}&apos;s Reflection 🍀
                      </span>
                      <p className="text-xs text-charcoal/80 italic leading-relaxed font-serif">
                        &ldquo;{selectedEntry.reflection}&rdquo;
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Empty state for notepad */
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
              <BookOpen className="w-12 h-12 text-charcoal/20 mb-4 animate-float" />
              <h3 className="font-display font-black text-base text-charcoal">Your Journal is Quiet</h3>
              <p className="text-xs text-charcoal/40 max-w-xs leading-relaxed mt-2">
                Click &ldquo;Write New Page&rdquo; above to write down your thoughts and get a warm reflection from your companion.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Scrollable Notebook Index list of past entries */}
        <div className="w-full md:w-80 flex flex-col min-h-0">
          <div className="bg-white/60 border border-white/95 rounded-3xl p-4 shadow-md flex-grow flex flex-col min-h-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-charcoal/40 block mb-3 px-1">
              Notebook Index ({entries.length} Pages)
            </span>

            {loading ? (
              <div className="flex-grow flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : entries.length === 0 ? (
              <div className="flex-grow flex items-center justify-center text-center p-4">
                <span className="text-xs text-charcoal/30 font-medium">No pages written yet.</span>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {entries.map(entry => {
                  const isSelected = selectedEntry?.id === entry.id
                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        setSelectedEntry(entry)
                        setIsEditing(false)
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-[#E3F4EA] border-[#C9EDD6] shadow-3xs'
                          : 'bg-white/60 border-transparent hover:bg-white/90 hover:border-charcoal/5 shadow-2xs'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-bold block truncate leading-snug ${
                          isSelected ? 'text-primary-dark' : 'text-charcoal'
                        }`}>
                          {entry.title}
                        </span>
                        <span className="text-[9px] text-charcoal/40 font-bold block mt-1">
                          {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 text-charcoal/20 group-hover:text-charcoal/40 group-hover:translate-x-0.5 transition-all ${
                        isSelected ? 'text-primary-dark' : ''
                      }`} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
