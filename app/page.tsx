// app/page.tsx
'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { parseMediaFiles } from '@/lib/media-parser'
import { loadOpenCV } from '@/lib/opencv-hdr'
import { useMediaContext } from '@/lib/media-context'
import FolderPicker from '@/components/FolderPicker'
import FilterTabs, { type FilterType } from '@/components/FilterTabs'
import MediaGrid from '@/components/MediaGrid'

const VALID_FILTERS = new Set<FilterType>(['all', 'video', 'photo', 'hdr', 'panorama'])

function isFilterType(s: string | null): s is FilterType {
  return s != null && VALID_FILTERS.has(s as FilterType)
}

export default function Page() {
  return (
    <Suspense>
      <Gallery />
    </Suspense>
  )
}

function Gallery() {
  const { items, setItems } = useMediaContext()
  const [folderName, setFolderName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const tabParam = searchParams.get('tab')
  const [filter, setFilter] = useState<FilterType>(
    isFilterType(tabParam) ? tabParam : 'all',
  )

  function handleFilterChange(f: FilterType) {
    setFilter(f)
    const params = new URLSearchParams(searchParams.toString())
    if (f === 'all') {
      params.delete('tab')
    } else {
      params.set('tab', f)
    }
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
    const firstPath = (files[0] as File & { webkitRelativePath: string }).webkitRelativePath
    setFolderName(firstPath.split('/')[0] ?? 'Unknown folder')
    setFilter('all')
    setLoading(true)
    setError(null)
    try {
      const parsed = await parseMediaFiles(files)
      setItems(parsed)
      if (parsed.some((item) => item.type === 'hdr')) {
        loadOpenCV().catch(() => {}) // preload WASM while user browses gallery
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse media files.')
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(index: number) {
    const qs = searchParams.toString()
    router.push(`/media/${index}${qs ? `?${qs}` : ''}`)
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!items && !loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100">
        <h1 className="mb-3">DJI Media Viewer</h1>
        <p className="text-muted mb-4">Select your drone SD card folder to get started.</p>
        <FolderPicker onFiles={handleFiles} />
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100">
        <div className="spinner-border text-primary mb-3" role="status" />
        <p className="text-muted">Reading media files…</p>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100">
        <div className="alert alert-danger">{error}</div>
        <FolderPicker onFiles={handleFiles} />
      </div>
    )
  }

  // ── Loaded state ─────────────────────────────────────────────────────────
  return (
    <div>
      <nav className="navbar navbar-light bg-light border-bottom mb-4">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">DJI Media Viewer</span>
          <span className="text-muted small me-auto ms-3">
            {folderName} · {items!.length} items
          </span>
          <FolderPicker onFiles={handleFiles} />
        </div>
      </nav>
      <div className="container-fluid">
        <FilterTabs items={items!} active={filter} onChange={handleFilterChange} />
        <MediaGrid items={items!} filter={filter} onSelect={handleSelect} />
      </div>
    </div>
  )
}
