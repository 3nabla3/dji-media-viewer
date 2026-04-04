// lib/use-thumbnail.ts
"use client";

import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Returns a URL for the given File, lazily created when the returned `ref`
 * element scrolls into view.
 */
export function useThumbnail(file: File): { url: string | null; ref: RefObject<HTMLDivElement | null> } {
  const [url, setUrl] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        setUrl(URL.createObjectURL(file))
      },
      { rootMargin: '400px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [file])

  return { url, ref }
}
