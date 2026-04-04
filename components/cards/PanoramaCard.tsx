// components/cards/PanoramaCard.tsx
'use client'

import type { PanoramaItem } from '@/lib/media-types'
import { useThumbnail } from '@/lib/use-thumbnail'

function TileThumb({ file }: { file: File }) {
  console.log(file);
  const { url } = useThumbnail(file)
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="img-fluid" style={{ height: '60px', objectFit: 'cover', width: '100%' }} />
  ) : (
    <div className="bg-secondary-subtle" style={{ height: '60px', width: '100%' }} />
  )
}

export default function PanoramaCard({ item, onClick }: { item: PanoramaItem; onClick: () => void }) {
  // Use the first tile's ref to drive lazy loading for the whole card
  console.log(item);
  const { ref } = useThumbnail(item.tiles[0])

  return (
    <div ref={ref} className="card h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
      <div className="card-header p-2">
        <span className="badge bg-info text-dark me-1">PANORAMA</span>
        <small className="text-muted">
          {item.htmlFile.name} · {item.tiles.length} tiles
        </small>
      </div>
      <div className="card-body p-2">
        <div className="row row-cols-4 g-1">
          {item.tiles.map((tile, i) => (
            <div key={i} className="col">
              <TileThumb file={tile} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
