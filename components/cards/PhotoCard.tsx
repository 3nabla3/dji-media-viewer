// components/cards/PhotoCard.tsx
'use client'

import { useEffect, useState } from 'react'
import type { PhotoItem } from '@/lib/media-types'

export default function PhotoCard({ item, onClick }: { item: PhotoItem; onClick: () => void }) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.file])

  if (!url) return null

  return (
    <div className="card h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
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
