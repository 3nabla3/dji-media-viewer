// lib/use-thumbnail.ts
// Generates a small thumbnail for a File, using the EXIF embedded thumbnail
// when available (DJI cameras embed a 320×180 px JPEG — no full decode needed),
// falling back to canvas downscaling. Results are cached in memory for the session.

import exifr from 'exifr'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

const cache = new Map<string, string>()

function cacheKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

async function makeThumbnail(file: File): Promise<string> {
  const k = cacheKey(file)
  const hit = cache.get(k)
  if (hit) return hit

  // Fast path: EXIF embedded thumbnail (a few KB, no full image decode)
  try {
    const thumb = await exifr.thumbnail(file)
    if (thumb) {
      const blob = new Blob([thumb.buffer as ArrayBuffer], { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      cache.set(k, url)
      return url
    }
  } catch {
    // fall through to canvas
  }

  // Fallback: decode full image and downscale to 400px
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 400 / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.8)
  })
  const url = URL.createObjectURL(blob)
  cache.set(k, url)
  return url
}

/**
 * Returns a thumbnail URL for the given File, generated lazily when the
 * returned `ref` element scrolls into view. Attach `ref` to the card's
 * root element so the IntersectionObserver knows when to start.
 */
export function useThumbnail(file: File): { url: string | null; ref: RefObject<HTMLDivElement | null> } {
  const k = cacheKey(file)
  const [url, setUrl] = useState<string | null>(cache.get(k) ?? null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cache.get(cacheKey(file))) return // already cached, state already set

    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        makeThumbnail(file).then(setUrl).catch(() => {})
      },
      { rootMargin: '400px' }, // start loading 400px before entering viewport
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [file])

  return { url, ref }
}
