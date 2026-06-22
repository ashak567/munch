'use server'
 
import { createClient } from '@/utils/supabase/server'

/** Supported video formats in preference order. */
const VIDEO_FORMATS = ['webm', 'mp4'] as const

export interface VideoSources {
  /** Preferred format (WebM), null if unavailable */
  webm: string | null
  /** Fallback format (MP4), null if unavailable */
  mp4: string | null
}

/**
 * Attempts to sign a URL for the given path.
 * Returns the signed URL or null if the file doesn't exist.
 */
async function trySignUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string,
  expiresIn = 600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error || !data) return null
  return data.signedUrl
}

/**
 * Signs URLs for all available video formats (WebM preferred, MP4 fallback).
 * The base path should NOT include a file extension.
 */
async function getVideoSources(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  basePath: string
): Promise<VideoSources> {
  // Fire all format checks in parallel
  const results = await Promise.all(
    VIDEO_FORMATS.map((fmt) =>
      trySignUrl(supabase, bucket, `${basePath}.${fmt}`)
    )
  )

  return {
    webm: results[0],
    mp4: results[1],
  }
}

/**
 * Strips the file extension from a storage path.
 * e.g. "abc123/hero-mobile.mp4" → "abc123/hero-mobile"
 */
function stripExtension(path: string): string {
  return path.replace(/\.[^.]+$/, '')
}
 
/**
 * Resolves signed URLs for the hero mobile video (WebM + MP4).
 */
export async function getHeroMobileUrl(): Promise<string | null> {
  return getHeroMobileSources().then(pickBest)
}

export async function getHeroMobileSources(): Promise<VideoSources> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { webm: null, mp4: null }
 
    const { data: assets } = await supabase
      .from('user_assets')
      .select('hero_mobile_path')
      .eq('user_id', user.id)
      .maybeSingle()
 
    const rawPath = assets?.hero_mobile_path || `${user.id}/hero-mobile.mp4`
    const basePath = stripExtension(rawPath)

    return await getVideoSources(supabase, 'user-videos', basePath)
  } catch (error) {
    console.error('[Assets Server] Error in getHeroMobileSources:', error)
    return { webm: null, mp4: null }
  }
}
 
/**
 * Resolves signed URLs for the hero desktop video (WebM + MP4).
 */
export async function getHeroDesktopUrl(): Promise<string | null> {
  return getHeroDesktopSources().then(pickBest)
}

export async function getHeroDesktopSources(): Promise<VideoSources> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { webm: null, mp4: null }
 
    const { data: assets } = await supabase
      .from('user_assets')
      .select('hero_desktop_path')
      .eq('user_id', user.id)
      .maybeSingle()
 
    const rawPath = assets?.hero_desktop_path || `${user.id}/hero-desktop.mp4`
    const basePath = stripExtension(rawPath)

    return await getVideoSources(supabase, 'user-videos', basePath)
  } catch (error) {
    console.error('[Assets Server] Error in getHeroDesktopSources:', error)
    return { webm: null, mp4: null }
  }
}

/**
 * Returns the best available URL from a VideoSources (prefers WebM).
 */
function pickBest(sources: VideoSources): string | null {
  return sources.webm || sources.mp4
}
 
/**
 * Resolves the signed URL for a specific mascot image.
 */
export async function getMascotUrl(mascotName: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
 
    const { data: assets } = await supabase
      .from('user_assets')
      .select('mascot_base_path')
      .eq('user_id', user.id)
      .maybeSingle()
 
    // Clean mascot name format
    const mascotFile = mascotName.endsWith('.png') ? mascotName : `${mascotName}.png`
    const path = assets?.mascot_base_path 
      ? `${assets.mascot_base_path}/${mascotFile}` 
      : `${user.id}/${mascotFile}`
 
    const { data, error } = await supabase.storage
      .from('user-mascots')
      .createSignedUrl(path, 600)
 
    if (error || !data) {
      console.warn(`[Assets Server] Failed to sign mascot url for character ${mascotName}:`, error?.message)
      return null
    }
 
    return data.signedUrl
  } catch (error) {
    console.error('[Assets Server] Error in getMascotUrl:', error)
    return null
  }
}
 
/**
 * Resolves the signed URL for the envelope texture.
 */
export async function getEnvelopeTextureUrl(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
 
    const path = `${user.id}/envelope-texture.png`
 
    const { data, error } = await supabase.storage
      .from('user-textures')
      .createSignedUrl(path, 600)
 
    if (error || !data) {
      console.warn(`[Assets Server] Failed to sign envelope texture url for path ${path}:`, error?.message)
      return null
    }
 
    return data.signedUrl
  } catch (error) {
    console.error('[Assets Server] Error in getEnvelopeTextureUrl:', error)
    return null
  }
}
