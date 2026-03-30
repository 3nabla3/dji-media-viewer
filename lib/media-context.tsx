// lib/media-context.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { MediaItem } from './media-types'

interface MediaContextValue {
  items: MediaItem[] | null
  setItems: (items: MediaItem[]) => void
}

const MediaContext = createContext<MediaContextValue | null>(null)

export function MediaProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  return (
    <MediaContext.Provider value={{ items, setItems }}>
      {children}
    </MediaContext.Provider>
  )
}

export function useMediaContext(): MediaContextValue {
  const ctx = useContext(MediaContext)
  if (!ctx) throw new Error('useMediaContext must be used inside <MediaProvider>')
  return ctx
}
