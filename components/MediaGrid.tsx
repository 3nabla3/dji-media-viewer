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
  onSelect: (index: number) => void
}

export default function MediaGrid({ items, filter, onSelect }: MediaGridProps) {
  const visible = filter === 'all'
    ? items.map((item, idx) => ({ item, idx }))
    : items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.type === filter)

  if (visible.length === 0) {
    return <p className="text-muted">No items to display.</p>
  }

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
      {visible.map(({ item, idx }) => (
        <div key={idx} className="col">
          {item.type === 'video' && <VideoCard item={item} onClick={() => onSelect(idx)} />}
          {item.type === 'photo' && <PhotoCard item={item} onClick={() => onSelect(idx)} />}
          {item.type === 'hdr' && <HdrCard item={item} onClick={() => onSelect(idx)} />}
          {item.type === 'panorama' && <PanoramaCard item={item} onClick={() => onSelect(idx)} />}
        </div>
      ))}
    </div>
  )
}
