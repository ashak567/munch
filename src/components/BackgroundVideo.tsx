'use client'
 
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import {
  getHeroMobileSourcesCached,
  getHeroDesktopSourcesCached,
  type VideoSources,
} from '@/lib/assets-client'
 
export default function BackgroundVideo() {
  const [sources, setSources] = useState<VideoSources>({ webm: null, mp4: null })
  const [hasError, setHasError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
 
  // Determine viewport size
  useEffect(() => {
    if (typeof window === 'undefined') return
 
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768)
    }
 
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  // Lazy loading: only fetch video when the sentinel is in the viewport
  useEffect(() => {
    if (typeof window === 'undefined') return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])
 
  // Load signed URLs based on viewport — only after lazy trigger
  useEffect(() => {
    if (!isInView) return

    let active = true
 
    async function fetchVideo() {
      try {
        const videoSources = isMobile 
          ? await getHeroMobileSourcesCached() 
          : await getHeroDesktopSourcesCached()
 
        if (active) {
          const hasAnySource = videoSources.webm || videoSources.mp4
          if (hasAnySource) {
            setSources(videoSources)
            setHasError(false)
            setShowWarning(false)
          } else {
            setSources({ webm: null, mp4: null })
            setHasError(true)
            const dismissed = sessionStorage.getItem('dismissed-asset-warning')
            if (!dismissed) {
              setShowWarning(true)
            }
          }
        }
      } catch (err) {
        console.warn('[BackgroundVideo] Error retrieving signed video URL:', err)
        if (active) {
          setSources({ webm: null, mp4: null })
          setHasError(true)
          const dismissed = sessionStorage.getItem('dismissed-asset-warning')
          if (!dismissed) {
            setShowWarning(true)
          }
        }
      }
    }
 
    fetchVideo()
 
    return () => {
      active = false
    }
  }, [isMobile, isInView])
 
  // Handle video element load errors
  const handleVideoError = useCallback(() => {
    console.warn('[BackgroundVideo] Error loading video stream from signed URL')
    setHasError(true)
    const dismissed = sessionStorage.getItem('dismissed-asset-warning')
    if (!dismissed) {
      setShowWarning(true)
    }
  }, [])
 
  // Dismiss warning
  const dismissWarning = useCallback(() => {
    setShowWarning(false)
    sessionStorage.setItem('dismissed-asset-warning', 'true')
  }, [])

  const hasSource = sources.webm || sources.mp4
 
  return (
    <>
      {/* Lazy-load sentinel — always rendered to trigger IntersectionObserver */}
      <div
        ref={sentinelRef}
        className="fixed inset-0 -z-30 pointer-events-none"
        aria-hidden="true"
      />

      {/* Video Background — uses <source> for format negotiation */}
      {hasSource && !hasError && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={handleVideoError}
          className="fixed inset-0 w-full h-full object-cover -z-20 opacity-20 pointer-events-none select-none transition-opacity duration-1000 animate-fadeIn"
        >
          {/* Preferred: WebM (VP9/AV1) — smaller, better compression */}
          {sources.webm && (
            <source src={sources.webm} type="video/webm" />
          )}
          {/* Fallback: MP4 (H.264) — universal compatibility */}
          {sources.mp4 && (
            <source src={sources.mp4} type="video/mp4" />
          )}
        </video>
      )}
 
      {/* Warning Notice Banner */}
      {showWarning && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-80 z-50 animate-bounce-short">
          <div className="glass-panel border-2 border-yellow/40 rounded-2xl p-4 shadow-xl flex gap-3 items-start relative bg-white/90 backdrop-blur-md">
            <div className="p-1.5 rounded-lg bg-yellow/20 text-yellow-700 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-0.5">
              <h4 className="text-2xs font-black text-charcoal uppercase tracking-wider">Default Mode Active</h4>
              <p className="text-[10px] text-charcoal/70 leading-relaxed font-semibold">
                Personalized assets not found. Showing default experience.
              </p>
            </div>
            <button
              onClick={dismissWarning}
              className="text-charcoal/40 hover:text-charcoal/80 p-1 rounded-lg hover:bg-charcoal/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
