'use client'

import type { MediaItem } from '@/lib/media-types'

export type FilterType = 'all' | 'video' | 'photo' | 'hdr' | 'panorama'

interface FilterTabsProps {
  items: MediaItem[]
  active: FilterType
  onChange: (filter: FilterType) => void
}

const TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Videos' },
  { key: 'photo', label: 'Photos' },
  { key: 'hdr', label: 'HDR' },
  { key: 'panorama', label: 'Panoramas' },
]

export default function FilterTabs({ items, active, onChange }: FilterTabsProps) {
  function count(type: FilterType) {
    if (type === 'all') return items.length
    return items.filter((i) => i.type === type).length
  }

  return (
    <ul className="nav nav-tabs mb-3">
      {TABS.map(({ key, label }) => (
        <li key={key} className="nav-item">
          <button
            className={`nav-link${active === key ? ' active' : ''}`}
            onClick={() => onChange(key)}
          >
            {label}{' '}
            <span className="badge bg-secondary">{count(key)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
