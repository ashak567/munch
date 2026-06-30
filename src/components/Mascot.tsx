'use client'
 
import React, { useState, useEffect } from 'react'
import { motion, Variants } from 'framer-motion'
import { getMascotCached } from '@/lib/assets-client'
import { MASCOT_REGISTRY, MascotCharacter } from '@/lib/mascots/registry'
import { 
  MASCOT_EXPRESSION_REGISTRY, 
  MASCOT_ANIMATION_REGISTRY, 
  PRESENCE_MODE_MULTIPLIERS,
  PRESENCE_INTENSITY_MULTIPLIERS,
  PresenceMode,
  PresenceIntensity,
  AttentionTarget,
  MicroReaction,
  AnimationBudget
} from './mascot-config'

export type { MascotCharacter, PresenceMode, PresenceIntensity, AttentionTarget, MicroReaction, AnimationBudget }

export type MascotExpression = 
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'happy'
  | 'encouraging'
  | 'curious'
  | 'celebrating'
  | 'calm'
  | 'wry'

interface MascotProps {
  character?: MascotCharacter
  expression?: MascotExpression | string
  mode?: PresenceMode
  intensity?: PresenceIntensity
  attentionTarget?: AttentionTarget
  pupilOffsets?: { x: number; y: number }
  microReaction?: MicroReaction
  animationBudget?: AnimationBudget
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
}

const SIZE_MAP = {
  xs: 'w-8 h-8',
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32'
}

export default function Mascot({ 
  character = 'munch', 
  expression = 'idle', 
  mode = 'companion',
  intensity = 'medium',
  pupilOffsets = { x: 0, y: 0 },
  microReaction = 'none',
  animationBudget = 'medium',
  size = 'md', 
  className = '' 
}: MascotProps) {
  
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let active = true
    async function loadMascot() {
      try {
        setLoading(true)
        const url = await getMascotCached(character)
        if (active) {
          if (url) {
            setImageUrl(url)
            setHasError(false)
          } else {
            setImageUrl(null)
            setHasError(true)
          }
        }
      } catch (err) {
        console.warn(`[Mascot Component] Failed to load mascot asset ${character}:`, err)
        if (active) {
          setImageUrl(null)
          setHasError(true)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }
    loadMascot()
    return () => {
      active = false
    }
  }, [character])

  const sizeClass = typeof size === 'string' ? SIZE_MAP[size] : ''
  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : undefined

  // Build scaled framer-motion variants
  const modeMult = PRESENCE_MODE_MULTIPLIERS[mode] || PRESENCE_MODE_MULTIPLIERS.companion
  const intensityMult = PRESENCE_INTENSITY_MULTIPLIERS[intensity] || PRESENCE_INTENSITY_MULTIPLIERS.medium
  
  const isReducedMotion = animationBudget === 'reduced-motion'
  const isLowBudget = animationBudget === 'low'

  const speedScalar = isReducedMotion ? 0.001 : (modeMult.speed * intensityMult.speed)
  const amplitudeScalar = isReducedMotion ? 0.0 : (isLowBudget ? 0.45 : 1.0) * (modeMult.amplitude * intensityMult.amplitude)

  const mascotVariants: Variants = {}
  for (const [key, anim] of Object.entries(MASCOT_ANIMATION_REGISTRY)) {
    mascotVariants[key] = {
      y: anim.y ? anim.y.map(val => val * amplitudeScalar) : undefined,
      scaleY: anim.scaleY ? anim.scaleY.map(val => 1 + (val - 1) * amplitudeScalar) : undefined,
      rotate: anim.rotate ? anim.rotate.map(val => val * amplitudeScalar) : undefined,
      scale: anim.scale ? anim.scale.map(val => 1 + (val - 1) * amplitudeScalar) : undefined,
      transition: {
        duration: isReducedMotion ? 99999 : (anim.transition.duration / speedScalar),
        repeat: isReducedMotion ? 0 : anim.transition.repeat,
        ease: anim.transition.ease as any,
        repeatType: anim.transition.repeatType
      }
    }
  }

  // Define micro-reactions motion targets
  const getMicroReactionAnimate = () => {
    if (isReducedMotion) return undefined
    switch (microReaction) {
      case 'nod':
        return { y: 3.5, scaleY: 0.94 }
      case 'tilt':
        return { rotate: 6 }
      case 'bounce':
        return { y: -8, scaleY: [1, 0.9, 1.1, 1] }
      case 'head_turn':
        return { rotate: -4, x: -2 }
      case 'tail_wag':
      case 'ear_wiggle':
        return { scale: [1, 1.05, 0.95, 1] }
      default:
        return undefined
    }
  }

  const getAnimationVariant = () => {
    const exprConfig = MASCOT_EXPRESSION_REGISTRY[expression] || MASCOT_EXPRESSION_REGISTRY.idle
    return exprConfig.animationKey
  }

  const resolvedConfig = MASCOT_EXPRESSION_REGISTRY[expression] || MASCOT_EXPRESSION_REGISTRY.idle
  const spring = resolvedConfig.spring

  const resolvedStiffness = Math.max(10, spring.stiffness * speedScalar)
  const resolvedDamping = Math.max(5, spring.damping / amplitudeScalar)

  const showParticles = (expression === 'happy' || expression === 'celebrating') && !isReducedMotion

  const resolvedMascot = MASCOT_REGISTRY[character] || MASCOT_REGISTRY.munch

  return (
    <motion.div 
      className={`relative inline-block ${sizeClass} ${className} transition-all`}
      style={{
        ...sizeStyle,
        cursor: 'pointer'
      }}
      variants={mascotVariants}
      animate={getMicroReactionAnimate() || getAnimationVariant()}
      whileHover={isReducedMotion ? {} : {
        scale: 1.05,
        rotate: 1.5,
        transition: { type: 'spring', stiffness: 200, damping: 15 }
      }}
      whileTap={isReducedMotion ? {} : {
        scale: 0.95,
        rotate: -1.5,
        transition: { type: 'spring', stiffness: 300, damping: 12 }
      }}
      transition={{
        type: 'spring',
        stiffness: resolvedStiffness,
        damping: resolvedDamping
      }}
    >
      {loading ? (
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-45">
          {resolvedMascot.renderSVG(expression, pupilOffsets, microReaction, animationBudget)}
        </svg>
      ) : imageUrl && !hasError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img 
          src={imageUrl} 
          alt={character} 
          onError={() => setHasError(true)}
          className="w-full h-full object-contain"
        />
      ) : (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {resolvedMascot.renderSVG(expression, pupilOffsets, microReaction, animationBudget)}
        </svg>
      )}

      {/* Tiny Sparkle Particles for Celebrating/Happy states */}
      {showParticles && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          <motion.span 
            className="absolute text-yellow-400 text-xs"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], x: -8, y: -16 }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
            style={{ left: '10%', top: '20%' }}
          >
            ✨
          </motion.span>
          <motion.span 
            className="absolute text-yellow-300 text-[8px]"
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.1, 0.5], x: 8, y: -20 }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.6 }}
            style={{ right: '15%', top: '15%' }}
          >
            ✨
          </motion.span>
        </div>
      )}
    </motion.div>
  )
}
