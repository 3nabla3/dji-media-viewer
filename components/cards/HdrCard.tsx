// components/cards/HdrCard.tsx
'use client'

import type { HdrItem } from '@/lib/media-types'
import { useThumbnail } from '@/lib/use-thumbnail'

export default function HdrCard({ item, onClick }: { item: HdrItem; onClick: () => void }) {
  console.log(item);
  const { url, ref } = useThumbnail(item.middle)

  return (
    <div ref={ref} className="card h-100 border-warning" style={{ cursor: 'pointer' }} onClick={onClick}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.middle.name}
          className="card-img-top"
          style={{ height: '200px', objectFit: 'cover' }}
        />
      ) : (
        <div className="card-img-top bg-secondary-subtle" style={{ height: '200px' }} />
      )}
      <div className="card-body p-2">
        <span className="badge bg-warning text-dark me-1">HDR</span>
        <small className="text-muted">
          {item.files.length} exposures · {item.middle.name}
        </small>
      </div>
    </div>
  )
}
