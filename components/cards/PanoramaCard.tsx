'use client'

import { useMemo } from 'react'
import type { PanoramaItem } from '@/lib/media-types'

export default function PanoramaCard({ item }: { item: PanoramaItem }) {
  const tileUrls = useMemo(
    () => item.tiles.map((f) => URL.createObjectURL(f)),
    [item.tiles]
  )

  return (
    <div className="card h-100">
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
