// components/cards/PhotoCard.tsx
'use client'

import type { PhotoItem } from '@/lib/media-types'
import { useThumbnail } from '@/lib/use-thumbnail'

export default function PhotoCard({ item, onClick }: { item: PhotoItem; onClick: () => void }) {
  const { url, ref } = useThumbnail(item.file)

  return (
    <div ref={ref} className="card h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.file.name}
          className="card-img-top"
          style={{ height: '200px', objectFit: 'cover' }}
        />
      ) : (
        <div className="card-img-top bg-secondary-subtle" style={{ height: '200px' }} />
      )}
      <div className="card-body p-2">
        <span className="badge bg-success me-1">PHOTO</span>
        <small className="text-muted">{item.file.name}</small>
      </div>
    </div>
  )
}
