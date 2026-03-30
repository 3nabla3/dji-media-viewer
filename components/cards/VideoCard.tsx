// components/cards/VideoCard.tsx
'use client'

import { useEffect, useState } from 'react'
import type { VideoItem } from '@/lib/media-types'

export default function VideoCard({ item }: { item: VideoItem }) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.file])

  if (!url) return null

  return (
    <div className="card h-100">
      <video
        src={url}
        controls
        className="card-img-top"
        style={{ maxHeight: '200px', objectFit: 'cover' }}
      />
      <div className="card-body p-2">
        <span className="badge bg-secondary me-1">VIDEO</span>
        <small className="text-muted">{item.file.name}</small>
      </div>
    </div>
  )
}
