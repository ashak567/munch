'use client'
 
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  getHeroMobileSourcesCached,
  getHeroDesktopSourcesCached,
  type VideoSources,
} from '@/lib/assets-client'
 
export default function BackgroundVideo() {
  const [sources, setSources] = useState<VideoSources>({ webm: null, mp4: null })
  const [hasError, setHasError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
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
          } else {
            setSources({ webm: null, mp4: null })
            setHasError(true)
          }
        }
      } catch (err) {
        console.warn('[BackgroundVideo] Error retrieving signed video URL:', err)
        if (active) {
          setSources({ webm: null, mp4: null })
          setHasError(true)
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
 
      {/* Warning Notice Banner — removed in production */}
    </>
  )
}
