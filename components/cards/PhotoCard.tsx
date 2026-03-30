'use client'

import { useMemo } from 'react'
import type { PhotoItem } from '@/lib/media-types'

export default function PhotoCard({ item }: { item: PhotoItem }) {
  const url = useMemo(() => URL.createObjectURL(item.file), [item.file])

  return (
    <div className="card h-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={item.file.name}
        className="card-img-top"
        style={{ height: '200px', objectFit: 'cover' }}
      />
      <div className="card-body p-2">
        <span className="badge bg-success me-1">PHOTO</span>
        <small className="text-muted">{item.file.name}</small>
      </div>
    </div>
  )
}
