'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface MotionWrapperProps {
  children: React.ReactNode
  className?: string
}

export function MotionTap({ children, className = '' }: MotionWrapperProps) {
  return (
    <motion.div
      whileTap={{ y: 1.5, scale: 0.98 }}
      whileHover={{ y: -0.5, scale: 1.01 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function MotionCard({ children, className = '' }: MotionWrapperProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SoftTransition({ children, className = '' }: MotionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
