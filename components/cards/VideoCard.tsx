'use client'

import { useMemo } from 'react'
import type { VideoItem } from '@/lib/media-types'

export default function VideoCard({ item }: { item: VideoItem }) {
  const url = useMemo(() => URL.createObjectURL(item.file), [item.file])

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
