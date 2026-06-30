'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion, Variants } from 'framer-motion'
import { Heart } from 'lucide-react'
import Mascot from '@/components/Mascot'
import { WelcomeProvider, useWelcome } from '@/lib/envelope/WelcomeContext'
import WelcomeLayoutWrapper from '@/app/(dashboard)/components/WelcomeLayoutWrapper'

function HomeContent() {
  const { state, loading, markRead } = useWelcome()
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()
  
  const [isOpen, setIsOpen] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  // Redirect to dashboard if no envelope welcome is needed
  useEffect(() => {
    if (!loading) {
      const needsEnvelope = state?.letter && !state.letter.is_read && state.presentation_type === 'envelope'
      if (!needsEnvelope) {
        router.replace('/dashboard')
      }
    }
  }, [loading, state, router])

  if (loading || !state?.letter || state.letter.is_read || state.presentation_type !== 'envelope') {
    return (
      <div className="flex-grow flex items-center justify-center bg-[#F8F6F2]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-charcoal/50 font-display">Entering companion space...</p>
        </div>
      </div>
    )
  }

  const letter = state.letter
  const character = state.mascot_character
  const expression = state.mascot_expression
  const messageContent = letter.content
  const mascotName = character.charAt(0).toUpperCase() + character.slice(1)

  const handleOpenSequence = () => {
    if (isOpening || isOpen) return
    setIsOpening(true)
  }

  const handleEnterWorkspace = async () => {
    setTransitioning(true)
    // Mark as read in backend
    await markRead(letter.id)
    // Short delay for fade-out transition before routing
    setTimeout(() => {
      router.replace('/dashboard')
    }, 800)
  }

  const envelopeVariants: Variants = {
    closed: {
      y: shouldReduceMotion ? 0 : [0, -8, 0],
      scale: shouldReduceMotion ? 1 : [1, 1.02, 1],
      transition: {
        y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
      }
    },
    opened: {
      y: 0,
      scale: 1,
      transition: { duration: 0.5 }
    }
  }

  return (
    <WelcomeLayoutWrapper>
      <AnimatePresence>
        {!transitioning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="flex-grow flex flex-col items-center justify-center p-4 relative z-10 min-h-screen"
          >
            {/* Header Greeting */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center mb-8 max-w-sm"
            >
              <h1 className="text-3xl font-display font-black text-primary-dark">
                Welcome Home 🌿
              </h1>
              <p className="text-sm text-charcoal/60 mt-2 font-poppins">
                {!isOpen ? "A soft letter has arrived for you. Swipe up or tap the envelope to read it." : "Take your time. Read when you're ready."}
              </p>
            </motion.div>

            {/* Centered Physical Envelope Container */}
            <div className="relative flex items-center justify-center w-full max-w-md h-96">
              <motion.div
                variants={envelopeVariants}
                animate={isOpening || isOpen ? 'opened' : 'closed'}
                drag={isOpening || isOpen ? false : "y"}
                dragConstraints={{ top: -140, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(event, info) => {
                  if (info.offset.y < -50) {
                    handleOpenSequence()
                  }
                }}
                onClick={handleOpenSequence}
                className="relative w-80 h-48 bg-[#E9D7C8] rounded-2xl shadow-2xl overflow-visible cursor-pointer flex items-center justify-center border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary-dark select-none"
                style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
              >
                {/* Envelope Satin Pink Ribbon */}
                <AnimatePresence>
                  {!isOpening && !isOpen && (
                    <>
                      <motion.div
                        exit={{ y: -100, opacity: 0, transition: { duration: 0.4 } }}
                        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-9 bg-[#F0C7D4] z-30 shadow-sm border-x border-[#e8b6c5]"
                      />
                      <motion.div
                        exit={{ x: -150, opacity: 0, transition: { duration: 0.4 } }}
                        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-9 bg-[#F0C7D4] z-30 shadow-sm border-y border-[#e8b6c5]"
                      />
                    </>
                  )}
                </AnimatePresence>

                {/* Wax Seal */}
                <AnimatePresence>
                  {!isOpening && !isOpen && (
                    <motion.div
                      exit={{ scale: 0.3, opacity: 0, transition: { delay: 0.1, duration: 0.3 } }}
                      className="absolute z-40 w-14 h-14 rounded-full bg-[#C48A7A] border-2 border-[#b57a6b] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                    >
                      <Heart className="w-6 h-6 text-white/80 fill-white/10" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Left Flap */}
                <div 
                  className="absolute inset-y-0 left-0 w-[51%] bg-[#D8B4A0] z-20"
                  style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
                />
                {/* Right Flap */}
                <div 
                  className="absolute inset-y-0 right-0 w-[51%] bg-[#D8B4A0] z-20"
                  style={{ clipPath: 'polygon(100% 0, 0 50%, 100% 100%)' }}
                />
                {/* Bottom Flap */}
                <div 
                  className="absolute inset-x-0 bottom-0 h-[52%] bg-[#E9D7C8] z-21"
                  style={{ clipPath: 'polygon(0 100%, 50% 0, 100% 100%)' }}
                />
                
                {/* Top Flap (3D Open swing) */}
                <motion.div
                  initial={{ rotateX: 0 }}
                  animate={isOpening || isOpen ? { rotateX: 180, zIndex: 5 } : { rotateX: 0, zIndex: 25 }}
                  transition={shouldReduceMotion ? { duration: 0.1 } : { delay: 0.3, duration: 0.5, ease: 'easeInOut' }}
                  className="absolute inset-x-0 top-0 h-[52%] bg-[#D8B4A0] origin-top"
                  style={{ 
                    clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden'
                  }}
                />

                {/* Letter Content Card */}
                <motion.div
                  initial={{ y: 0, scale: 0.95 }}
                  animate={isOpening || isOpen ? { y: -150, scale: 1.05 } : { y: 0, scale: 0.95 }}
                  transition={shouldReduceMotion ? { duration: 0.2 } : { delay: 0.7, duration: 0.7, ease: 'easeOut' }}
                  onAnimationComplete={() => {
                    if (isOpening) setIsOpen(true)
                  }}
                  className="absolute z-10 w-[94%] h-[94%] rounded-xl p-5 shadow-2xl flex flex-col justify-between border border-white/50 bg-[#FBF9F6] text-charcoal"
                >
                  <div className="space-y-3 flex-grow overflow-y-auto pr-1">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={isOpen ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="font-serif italic text-sm leading-relaxed text-charcoal/90 pt-1 text-left"
                    >
                      <span className="font-display font-black text-xs block uppercase tracking-wider text-primary-dark/80 not-italic mb-2 border-b border-primary/10 pb-1">
                        A Letter from {mascotName} 🍀
                      </span>
                      {messageContent}
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={isOpen ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="flex justify-between items-end border-t border-charcoal/10 pt-2"
                  >
                    <span className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest font-poppins">
                      Your Companion
                    </span>
                    <span className="font-display font-black text-sm text-primary-dark capitalize">
                      {character} 🍀
                    </span>
                  </motion.div>
                </motion.div>

                {/* Companion Mascot Floating Beside */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0, x: -50 }}
                      animate={{ scale: 1, opacity: 1, x: 0 }}
                      exit={{ scale: 0, opacity: 0, x: -30 }}
                      transition={shouldReduceMotion ? { duration: 0.2 } : { delay: 0.4, duration: 0.5, type: 'spring', stiffness: 100 }}
                      className="absolute z-20 -left-20 -bottom-8"
                    >
                      <Mascot character={character} expression={expression} size={110} className="drop-shadow-2xl" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Action transition button */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="mt-8"
                >
                  <button
                    onClick={handleEnterWorkspace}
                    className="px-6 py-3 rounded-full bg-primary-dark text-white font-display font-bold text-sm shadow-lg hover:shadow-xl hover:bg-primary transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    Enter Companion Space →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </WelcomeLayoutWrapper>
  )
}

export default function HomePageClient() {
  return (
    <WelcomeProvider>
      <HomeContent />
    </WelcomeProvider>
  )
}
