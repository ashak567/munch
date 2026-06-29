'use client'
 
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowRight,
  Compass,
  Heart,
  MessageSquare,
  Sparkles,
  AlertTriangle
} from 'lucide-react'
import Mascot from '@/components/Mascot'
 
interface PreferenceItem {
  category: string
  tag: string
  score: number
}
 
interface InsightsData {
  totalDecisions: number
  categoryDistribution: Record<string, number>
  satisfactionBreakdown: {
    love: number
    okay: number
    meh: number
  }
  totalFeedback: number
  preferences: PreferenceItem[]
  importanceDistribution?: Record<string, number>
}
 
export default function OurConversationsPage() {
  const router = useRouter()
  
  // State
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
 
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/preferences')
        if (!res.ok) {
          throw new Error('Failed to load reflections')
        }
        const parsed = await res.json()
        setData(parsed)
      } catch (err: unknown) {
        console.error(err)
        setErrorMsg(err instanceof Error ? err.message : 'Unable to retrieve your reflections.')
      } finally {
        setLoading(false)
      }
    }
 
    fetchInsights()
  }, [])
 
  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-16 space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-2xs text-charcoal/50">Listening to the quiet...</span>
      </div>
    )
  }
 
  if (errorMsg || !data) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
        <p className="text-xs text-charcoal/60">
          {errorMsg || "Unable to load reflections right now. Let's try again in a bit."}
        </p>
      </div>
    )
  }
 
  const { totalDecisions, categoryDistribution, satisfactionBreakdown, preferences, importanceDistribution } = data
 
  // 1. GATE CHECK: Minimum 5 decisions required
  if (totalDecisions < 5) {
    return (
      <div className="flex-grow flex flex-col justify-between h-full space-y-6">
        <div>
          <h2 className="font-display font-extrabold text-2xl text-charcoal">
            Our Conversations
          </h2>
          <p className="text-2xs text-charcoal/60 font-semibold uppercase tracking-wider text-secondary-dark">
            A quiet space for reflection
          </p>
        </div>
 
        {/* Ollie Empty State Block */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
          {/* Ollie Mascot Waving/Reflecting */}
          <div className="mb-6">
            <Mascot character="ollie" expression="think" size="xl" className="animate-float" />
          </div>
 
          <h3 className="font-display text-lg font-bold text-charcoal mb-3">
            {"\"I'm still learning what matters most to you.\""}
          </h3>
          <p className="text-xs text-charcoal/60 max-w-xs leading-relaxed mb-8">
            Ollie needs to sit with you through at least 5 decisions to notice patterns in what feels comfortable. Let&apos;s share a few more thoughts together.
          </p>
 
          <button
            onClick={() => router.push('/dashboard/new')}
            className="px-6 py-3.5 btn-clay-primary text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            Share My Thoughts
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }
 
  // 2. GENERATE MEANINGFUL REFLECTIONS (NO NUMBERS, SCORES, STATISTICS)
  const reflectionsList: { title: string; text: string; icon: React.ReactNode; color: string }[] = []
 
  // Observation 1: Familiarity (Always shown as a key insight)
  reflectionsList.push({
    title: "Choosing Familiarity",
    text: "I've noticed you often choose familiar paths when life feels busy.",
    icon: <Heart className="w-4 h-4 text-red-500" />,
    color: "bg-red-500/10 border-red-500/20"
  })
 
  // Observation 2: Category distribution
  const categories = Object.keys(categoryDistribution) as ('Food' | 'Entertainment' | 'Activities' | 'Shopping' | 'Other')[]
  let dominantCategory = 'Other'
  let maxCount = -1
  categories.forEach((cat) => {
    if (categoryDistribution[cat] > maxCount) {
      maxCount = categoryDistribution[cat]
      dominantCategory = cat
    }
  })
 
  if (maxCount > 0) {
    let catText = "You're exploring a wide variety of thoughts and keeping an open mind."
    let catTitle = "Open-minded explorations"
    if (dominantCategory === 'Food') {
      catTitle = "Cozy Spaces"
      catText = "Food seems to be a common space where you seek comfort and make space to breathe."
    } else if (dominantCategory === 'Entertainment') {
      catTitle = "Unwinding Stories"
      catText = "You often look to stories and entertainment when you want to unwind and rest."
    } else if (dominantCategory === 'Activities') {
      catTitle = "Clearing the Mind"
      catText = "Engaging in active moments seems to help you clear your mind and reset."
    } else if (dominantCategory === 'Shopping') {
      catTitle = "Mindful Selections"
      catText = "You carefully consider your options when choosing items to bring into your space."
    }
 
    reflectionsList.push({
      title: catTitle,
      text: catText,
      icon: <Compass className="w-4 h-4 text-primary-dark" />,
      color: "bg-primary/20 border-primary-dark/20"
    })
  }
 
  // Observation 3: Importance (Dynamic reflection from previous step selection)
  if (importanceDistribution && Object.keys(importanceDistribution).length > 0) {
    let dominantImportance = ''
    let maxImpCount = -1
    Object.keys(importanceDistribution).forEach((imp) => {
      if (importanceDistribution[imp] > maxImpCount) {
        maxImpCount = importanceDistribution[imp]
        dominantImportance = imp
      }
    })
 
    if (maxImpCount > 0) {
      let impText = ""
      if (dominantImportance === 'Peace of mind') {
        impText = "Peace of mind is often at the heart of your choices. You lean towards paths that quiet the noise and help you feel settled."
      } else if (dominantImportance === 'Saving time') {
        impText = "Saving time and keeping things simple is a gentle priority for you. You value paths that let you move forward without unnecessary delay."
      } else if (dominantImportance === 'Having fun') {
        impText = "You seek out playfulness and joy, looking for lighthearted moments that lift your spirits."
      } else if (dominantImportance === 'Learning something') {
        impText = "Curiosity guides many of your reflections. You're drawn to opportunities that let you discover new perspectives."
      } else if (dominantImportance === 'Feeling accomplished') {
        impText = "Making progress and taking meaningful steps brings you satisfaction. You value momentum and gentle achievement."
      }
 
      if (impText) {
        reflectionsList.push({
          title: `Guided by ${dominantImportance}`,
          text: impText,
          icon: <Sparkles className="w-4 h-4 text-yellow-700" />,
          color: "bg-yellow/20 border-yellow-700/20"
        })
      }
    }
  }
 
  // Observation 4: Comfort Tags (Leaning towards tags)
  const comfortableTags = preferences
    .filter((p) => p.score > 0)
    .slice(0, 3)
    .map((p) => p.tag)
 
  if (comfortableTags.length > 0) {
    const formattedTags = comfortableTags.join(', ')
    reflectionsList.push({
      title: "Gentle Preferences",
      text: `I've noticed you often seek out options matching your preference for ${formattedTags}, finding simple warmth in those choices.`,
      icon: <MessageSquare className="w-4 h-4 text-secondary-dark" />,
      color: "bg-secondary/20 border-secondary-dark/20"
    })
  }
 
  // Observation 5: Satisfaction / Rhythm
  const totalRatings = satisfactionBreakdown.love + satisfactionBreakdown.okay + satisfactionBreakdown.meh
  if (totalRatings > 0) {
    let satisfactionText = "You've been open to checking in with how each decision feels, helping us build a cozy space."
    if (satisfactionBreakdown.love > satisfactionBreakdown.okay + satisfactionBreakdown.meh) {
      satisfactionText = "Our choices together have been bringing a genuine sense of comfort and ease to your days."
    } else if (satisfactionBreakdown.meh > satisfactionBreakdown.love + satisfactionBreakdown.okay) {
      satisfactionText = "We are still finding our rhythm, but each choice helps us learn what brings you peace."
    }
 
    reflectionsList.push({
      title: "Our Rhythm Together",
      text: satisfactionText,
      icon: <Sparkles className="w-4 h-4 text-coral-dark" />,
      color: "bg-coral/20 border-coral-dark/20"
    })
  }
 
  return (
    <div className="flex-grow flex flex-col justify-between h-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display font-extrabold text-2xl text-charcoal">
          Our Conversations
        </h2>
        <p className="text-2xs text-charcoal/60 font-semibold uppercase tracking-wider text-primary-dark">
          Observations and reflections on our path together 🍀
        </p>
      </div>
 
      {/* Main Reflections Container */}
      <div className="flex-1 space-y-4 max-h-[460px] overflow-y-auto pr-1">
        
        {/* Ollie Greeting Bubble */}
        <div className="glass-card rounded-3xl p-5 border border-white/50 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-shrink-0">
              <Mascot character="ollie" expression="idle" size="md" />
            </div>
            <div className="flex-1 relative bg-white border border-white/85 rounded-2xl rounded-tl-none p-4 shadow-sm text-charcoal text-xs leading-relaxed">
              <p className="font-semibold text-charcoal">
                {"\"Let's look back at what feels comfortable to you.\""}
              </p>
            </div>
          </div>
        </div>
 
        {/* Reflections Stack */}
        <div className="space-y-3">
          {reflectionsList.map((reflection, index) => (
            <div 
              key={index}
              className={`glass-card rounded-2xl p-4 border flex gap-3.5 items-start transition-all hover:translate-y-[-1px] ${reflection.color}`}
            >
              <div className="p-2 rounded-xl bg-white border border-white/55 flex-shrink-0 mt-0.5 shadow-sm">
                {reflection.icon}
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-charcoal tracking-wide">
                  {reflection.title}
                </h4>
                <p className="text-2xs text-charcoal/70 leading-relaxed font-medium">
                  {reflection.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
