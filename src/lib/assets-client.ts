import {
  getHeroMobileSources,
  getHeroDesktopSources,
  getMascotUrl,
  getEnvelopeTextureUrl,
  type VideoSources,
} from './assets'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  url: string
  expiresAt: number
}

interface VideoSourcesEntry {
  sources: VideoSources
  expiresAt: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Signed URLs are valid for 10 minutes (600s from Supabase). */
const SIGNED_URL_LIFETIME_MS = 10 * 60 * 1000

/** Refresh if the URL expires within the next 5 minutes. */
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

/** sessionStorage key prefix — namespaced to avoid collisions. */
const STORAGE_PREFIX = 'munch_asset:'

// ─────────────────────────────────────────────────────────────────────────────
// L1: In-memory cache
// ─────────────────────────────────────────────────────────────────────────────

const memoryCache: Record<string, CacheEntry> = {}
const videoSourcesMemory: Record<string, VideoSourcesEntry> = {}

// ─────────────────────────────────────────────────────────────────────────────
// L2: sessionStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

function readSessionCache<T>(key: string): (T & { expiresAt: number }) | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (typeof parsed.expiresAt !== 'number') return null

    return parsed
  } catch {
    return null
  }
}

function writeSessionCache(key: string, entry: unknown): void {
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry))
  } catch {
    // Quota exceeded or unavailable
  }
}

function clearSessionCache(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k)
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    // Unavailable
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core resolvers
// ─────────────────────────────────────────────────────────────────────────────

function isFresh(expiresAt: number): boolean {
  return expiresAt - Date.now() > REFRESH_THRESHOLD_MS
}

/**
 * Resolves a single-URL asset through the two-tier cache.
 */
async function resolveAssetUrl(
  cacheKey: string,
  fetcher: () => Promise<string | null>
): Promise<string | null> {
  if (typeof window === 'undefined') return null

  // L1
  const mem = memoryCache[cacheKey]
  if (mem && isFresh(mem.expiresAt)) return mem.url

  // L2
  const session = readSessionCache<CacheEntry>(cacheKey)
  if (session?.url && isFresh(session.expiresAt)) {
    memoryCache[cacheKey] = session
    return session.url
  }

  // L3: Network
  const url = await fetcher()
  if (url) {
    const entry: CacheEntry = { url, expiresAt: Date.now() + SIGNED_URL_LIFETIME_MS }
    memoryCache[cacheKey] = entry
    writeSessionCache(cacheKey, entry)
  }
  return url
}

/**
 * Resolves multi-format video sources through the two-tier cache.
 * Returns both WebM and MP4 signed URLs when available.
 */
async function resolveVideoSources(
  cacheKey: string,
  fetcher: () => Promise<VideoSources>
): Promise<VideoSources> {
  if (typeof window === 'undefined') return { webm: null, mp4: null }

  // L1
  const mem = videoSourcesMemory[cacheKey]
  if (mem && isFresh(mem.expiresAt)) return mem.sources

  // L2
  const session = readSessionCache<VideoSourcesEntry>(cacheKey)
  if (session?.sources && isFresh(session.expiresAt)) {
    videoSourcesMemory[cacheKey] = session
    return session.sources
  }

  // L3: Network
  const sources = await fetcher()
  if (sources.webm || sources.mp4) {
    const entry: VideoSourcesEntry = {
      sources,
      expiresAt: Date.now() + SIGNED_URL_LIFETIME_MS,
    }
    videoSourcesMemory[cacheKey] = entry
    writeSessionCache(cacheKey, entry)
  }
  return sources
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns both WebM and MP4 signed URLs for the hero mobile video.
 */
export function getHeroMobileSourcesCached(): Promise<VideoSources> {
  return resolveVideoSources('hero-mobile-sources', getHeroMobileSources)
}

/**
 * Returns both WebM and MP4 signed URLs for the hero desktop video.
 */
export function getHeroDesktopSourcesCached(): Promise<VideoSources> {
  return resolveVideoSources('hero-desktop-sources', getHeroDesktopSources)
}

/**
 * Returns the best single URL for hero mobile (backward compat).
 */
export async function getHeroMobileCached(): Promise<string | null> {
  const sources = await getHeroMobileSourcesCached()
  return sources.webm || sources.mp4
}

/**
 * Returns the best single URL for hero desktop (backward compat).
 */
export async function getHeroDesktopCached(): Promise<string | null> {
  const sources = await getHeroDesktopSourcesCached()
  return sources.webm || sources.mp4
}

/**
 * Resolves a cached or freshly signed URL for a specific mascot image
 */
export function getMascotCached(mascotName: string): Promise<string | null> {
  return resolveAssetUrl(`mascot-${mascotName}`, () => getMascotUrl(mascotName))
}

/**
 * Resolves a cached or freshly signed URL for the envelope texture
 */
export function getEnvelopeTextureCached(): Promise<string | null> {
  return resolveAssetUrl('envelope-texture', getEnvelopeTextureUrl)
}

/**
 * Clears both cache tiers (e.g. on user logout)
 */
export function clearAssetCache(): void {
  for (const key in memoryCache) delete memoryCache[key]
  for (const key in videoSourcesMemory) delete videoSourcesMemory[key]
  clearSessionCache()
}

// Re-export for consumers
export type { VideoSources }
