'use client'

import type { MediaItem } from '@/lib/media-types'
import type { FilterType } from './FilterTabs'
import VideoCard from './cards/VideoCard'
import PhotoCard from './cards/PhotoCard'
import HdrCard from './cards/HdrCard'
import PanoramaCard from './cards/PanoramaCard'

interface MediaGridProps {
  items: MediaItem[]
  filter: FilterType
}

export default function MediaGrid({ items, filter }: MediaGridProps) {
  const visible = filter === 'all' ? items : items.filter((i) => i.type === filter)

  if (visible.length === 0) {
    return <p className="text-muted">No items to display.</p>
  }

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
      {visible.map((item, idx) => (
        <div key={idx} className="col">
          {item.type === 'video' && <VideoCard item={item} />}
          {item.type === 'photo' && <PhotoCard item={item} />}
          {item.type === 'hdr' && <HdrCard item={item} />}
          {item.type === 'panorama' && <PanoramaCard item={item} />}
        </div>
      ))}
    </div>
  )
}
