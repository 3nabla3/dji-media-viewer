// components/cards/HdrCard.tsx
'use client'

// TODO: Replace middle-exposure preview with OpenCV.js createMergeMertens exposure fusion.
// See: https://docs.opencv.org/4.x/d6/df5/group__photo__hdr.html

import { useEffect, useState } from 'react'
import type { HdrItem } from '@/lib/media-types'

export default function HdrCard({ item, onClick }: { item: HdrItem; onClick: () => void }) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.middle)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.middle])

  if (!url) return null

  return (
    <div className="card h-100 border-warning" style={{ cursor: 'pointer' }} onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={item.middle.name}
        className="card-img-top"
        style={{ height: '200px', objectFit: 'cover' }}
      />
      <div className="card-body p-2">
        <span className="badge bg-warning text-dark me-1">HDR</span>
        <span className="badge bg-warning text-dark me-1" title="Full HDR blend not yet implemented">
          preview only
        </span>
        <br />
        <small className="text-muted">
          {item.files.length} exposures · middle: {item.middle.name}
        </small>
      </div>
    </div>
  )
}
