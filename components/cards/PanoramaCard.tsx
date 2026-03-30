// components/cards/PanoramaCard.tsx
'use client'

import { useEffect, useState } from 'react'
import type { PanoramaItem } from '@/lib/media-types'

export default function PanoramaCard({ item, onClick }: { item: PanoramaItem; onClick: () => void }) {
  const [tileUrls, setTileUrls] = useState<string[]>([])

  useEffect(() => {
    const urls = item.tiles.map((f) => URL.createObjectURL(f))
    setTileUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [item.tiles])

  return (
    <div className="card h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div className="card-header p-2">
        <span className="badge bg-info text-dark me-1">PANORAMA</span>
        <small className="text-muted">
          {item.htmlFile.name} · {item.tiles.length} tiles
        </small>
      </div>
      <div className="card-body p-2">
        <div className="row row-cols-4 g-1">
          {tileUrls.map((url, i) => (
            <div key={i} className="col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`tile ${i + 1}`}
                className="img-fluid"
                style={{ height: '60px', objectFit: 'cover', width: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
