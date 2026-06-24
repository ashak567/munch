import React from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowRight, ChevronRight, Star, Sparkles } from 'lucide-react'
import Mascot from '@/components/Mascot'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoggedIn = !!user



  return (
    <div className="flex-grow flex flex-col bg-cream relative overflow-hidden">
      {/* Background Clover Particle System */}
      <div className="absolute top-10 left-5 text-4xl opacity-20 select-none animate-float">🍀</div>
      <div className="absolute top-1/4 right-8 text-3xl opacity-20 select-none animate-float-delayed">✨</div>
      <div className="absolute bottom-32 left-10 text-3xl opacity-20 select-none animate-float">🍀</div>
      <div className="absolute top-3/4 left-1/3 text-4xl opacity-10 select-none animate-float-delayed">🌟</div>
      <div className="absolute bottom-12 right-12 text-5xl opacity-15 select-none animate-float">🍀</div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-start items-center px-4 py-12 sm:px-6 lg:px-8 max-w-lg mx-auto w-full z-10 space-y-12">
        
        {/* Header Logo */}
        <div className="inline-flex items-center gap-2 animate-float text-center">
          <span className="text-5xl">🍀</span>
          <span className="font-display text-4xl font-extrabold tracking-tight text-primary-dark">
            Munch
          </span>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="font-display text-4xl sm:text-5xl font-black text-charcoal leading-tight">
            Slow down.<br />
            <span className="text-primary-dark">Find comfort in your choices.</span>
          </h1>
          <p className="text-sm sm:text-base text-charcoal/70 leading-relaxed max-w-sm mx-auto">
            A gentle four-leaf clover companion that helps you understand your thoughts, listen to your feelings, and find comfort in where to begin.
          </p>

          <div className="pt-4 max-w-xs mx-auto">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="w-full py-3.5 px-6 btn-clay-primary text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                Go to my space
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="space-y-3">
                <Link
                  href="/register"
                  className="w-full py-3.5 px-6 btn-clay-primary text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  Meet Munch 🍀
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="w-full py-3.5 px-6 border-2 border-charcoal/10 rounded-2xl bg-white hover:bg-charcoal/5 text-charcoal font-semibold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  Log In
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mascot Showcase Section */}
        <div className="w-full space-y-4 text-center">
          <div className="space-y-1">
            <h3 className="font-display font-black text-xl text-charcoal">
              Meet your companion
            </h3>
            <p className="text-3xs text-charcoal/50 uppercase tracking-widest font-bold">
              Gently quiets the noise in your mind
            </p>
          </div>

          <div className="flex justify-center pt-1 px-1">
            <div className="w-48 glass-panel rounded-3xl p-6 border text-center flex flex-col items-center justify-between space-y-4 shadow-md hover:scale-102 hover:shadow-lg transition-all bg-white/60">
              <Mascot character="munch" expression="idle" size="md" />
              <div>
                <h4 className="font-display font-extrabold text-sm text-charcoal truncate w-full">
                  Munch 🍀
                </h4>
                <p className="text-3xs text-charcoal/60 leading-snug mt-1 max-w-[140px] mx-auto">
                  Understanding: Gently quiets the noise in your mind
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Steps */}
        <div className="w-full space-y-5">
          <h3 className="font-display font-black text-xl text-charcoal text-center">
            How Munch Helps You
          </h3>

          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-4 border border-white/60 flex gap-3.5 items-start">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary-dark flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-inner">
                1
              </span>
              <div>
                <h4 className="text-xs font-bold text-charcoal">Share your thoughts</h4>
                <p className="text-2xs text-charcoal/60 leading-relaxed mt-0.5">
                  Write down the paths you&apos;re stuck between. Take your time—there is never any rush.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/60 flex gap-3.5 items-start">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary-dark flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-inner">
                2
              </span>
              <div>
                <h4 className="text-xs font-bold text-charcoal">Reflect on what matters</h4>
                <p className="text-2xs text-charcoal/60 leading-relaxed mt-0.5">
                  Munch notices what usually brings you comfort and gently points towards a warm path forward.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/60 flex gap-3.5 items-start">
              <span className="w-6 h-6 rounded-full bg-yellow/20 text-yellow-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-inner">
                3
              </span>
              <div>
                <h4 className="text-xs font-bold text-charcoal">Find peace of mind</h4>
                <p className="text-2xs text-charcoal/60 leading-relaxed mt-0.5">
                  Receive a warm, thoughtful explanation of why this path makes sense, helping you quiet the chatter.
                </p>
              </div>
            </div>
          </div>
        </div>



        {/* Final CTA glass panel */}
        <div className="w-full glass-panel border-2 border-primary/20 rounded-3xl p-6 text-center space-y-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full flex items-center justify-center pr-2 pb-2">
            <Sparkles className="w-5 h-5 text-primary-dark" />
          </div>
          
          <h3 className="font-display text-lg font-black text-charcoal leading-tight">
            Let&apos;s figure it out together.
          </h3>
          <p className="text-2xs text-charcoal/60 leading-normal max-w-xs mx-auto">
            Munch is here to help you hear yourself more clearly. Quiet the overthinking, and take a gentle step forward today.
          </p>
          <div className="pt-2">
            <Link
              href={isLoggedIn ? "/dashboard" : "/register"}
              className="py-3 px-6 btn-clay-primary text-xs inline-flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              Begin with Munch
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center text-3xs text-charcoal/40 pt-6 border-t border-charcoal/5">
          Munch © {new Date().getFullYear()}. Built with love, clovers, and warm support.
        </footer>
      </div>
    </div>
  )
}
